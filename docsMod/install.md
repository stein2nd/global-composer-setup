# Global Composer Package Setup - install 方式

`global-composer install` の方式です。

## 背景

`global-composer install` の実装方式について、姉妹 npm 実装と同じ3型を Composer 語彙で比較します。
**CCU との整合** および **依存 CLI を `$COMPOSER_HOME/vendor/bin` に載せる** ことを最優先し、**C 型を採用** します。

install の入力は **実効 `composer.json`**、`$SETUP_DIR/composer.json` です ([layout.md](./layout.md))。
実インストール先は **`$COMPOSER_HOME`** (Composer global project) です。`$SETUP_DIR` ではありません。

FOP 構成でも C 型の意味論は変えません。
変わるのは、列挙と spec 組み立てを **ドメインの純関数** に置き、`composer global require` / `composer global install` を **アダプタ** に閉じることです。

## 方式の比較 (要約)

| 方式 | 概要 | CLI on PATH | CCU 整合 | OS 非依存 |
| --- | --- | --- | --- | --- |
| A. jq 列挙 | シェルで `composer global require $(jq …)` | ◎ | ◎ | △ (jq + シェル) |
| B. setup を COMPOSER_HOME にする | `$SETUP_DIR` で `composer install` | △ | △ | ◎ |
| **C. 列挙して明示 install** | 実効 `composer.json` を読み、明示的に global project へ入れる | ◎ | ◎ | ◎ |

### B 型を採用しない理由

`$SETUP_DIR` を `COMPOSER_HOME` にすると、overlay 管理ファイル (`user-deps.json`、`.upstream-meta.json`) と Composer の global project が混線します。
`$SETUP_DIR` で素の `composer install` を走らせても、bin は `$SETUP_DIR/vendor/bin` にしか出ず、ユーザーの PATH (`$COMPOSER_HOME/vendor/bin`) に載りません。

npm 実装の B 型 (`npm install -g` 引数なし) が「メタ pkg だけ入り、依存 CLI の bin が prefix に載らない」のと同型の失敗です。

Composer の `composer global install` は **すでに COMPOSER_HOME の `composer.json` があるとき** の実現コマンドとしては正しいです。
C 型は「実効 manifest の `require` を COMPOSER_HOME のルート require として列挙し、その上で `composer global require` / `composer global install` する」という意味です。

## 決定事項: C 型 (列挙 → 明示 global project 投入)

### 挙動

1. `syncManifest()` で実効 `composer.json` を最新化する。
2. 実効 `composer.json` の `require` を読む。
3. プラットフォームパッケージ (`php`、`ext-*`) を除く。
4. 各 `vendor/package:constraint` を **COMPOSER_HOME のルート require** として投入する。
   * 主手段: `composer global require -- vendor/pkg:constraint …`
   * すでに COMPOSER_HOME の `composer.json` が実効 `require` とそろっているときは `composer global install` で実現してよい。
5. 必要なら `allow-plugins` を COMPOSER_HOME 側で許可する (CCU 等)。

姉妹 v1の jq 処理および npm C 型と **「列挙したものをトップレベル global として入れる」意味論は同一** です。
シェルと jq を、CLUI 内の関数合成に移しただけです。

Composer 側の主な実体はユーザー指定どおり **`composer global install`** です。
列挙をルート require に載せるために `composer global require` を使います。

### `require-dev`: B 案 (維持)

| 操作 | `require` | `require-dev` |
| --- | --- | --- |
| `check`、`update` (CCU) | 対象 | 対象。実効 `composer.json` にマージ済みの分 |
| `install` | 対象 (platform 除く) | **対象外** |

`user-deps.json` の `require-dev` は CCU 管理用に実効 `composer.json` にマージするが、global install はしません。

## CCU との整合

| サブコマンド | 操作対象 | CCU、Composer の入力 |
| --- | --- | --- |
| `global-composer check` | 更新確認のみ | 実効 `composer.json` (`--working-dir=$SETUP_DIR --dry-run`) |
| `global-composer update` | バージョン制約の書き換え | 実効 `composer.json` |
| `global-composer install` | グローバルインストール | 実効 `composer.json` の **`require`** のみ → COMPOSER_HOME |

### 整合のポイント

* **install** が入れるパッケージ集合 = 実効 `composer.json` の `require` (platform 除く)。
* **check、update** は実効 `composer.json` の `require` + `require-dev` を読む。
* 名称は `vendor/package:constraint` 形式で Composer に渡す (例: `friendsofphp/php-cs-fixer:^3.64`)。
* `update` で書き換えた constraint が、直後の `install` で Packagist 上の最新版として反映される。
* `update` は `composer global update` を呼ばない。実環境を動かすのは `install` だけです。

### 定番フロー

```sh
global-composer check    # sync → 更新候補の確認
global-composer update   # 実効 composer.json の constraint を更新
global-composer install  # 更新後の制約で各 pkg を Composer global に入れる
```

`global-composer install` 単体では CCU は実行しません。

## 実装概要 (FOP)

application の `handleInstall` は、次の合成です。

```ts
prepare(); // application: syncManifest (domain merge + adapters I/O)

const requireMap = readRequire(materializedComposerPath); // adapter

const specs = Object.entries(requireMap)
  .filter(([name]) => !isPlatformPackage(name))
  .map(([name, constraint]) => toGlobalInstallSpec(name, constraint)); // domain

if (specs.length === 0) {
  console.error('No packages to install.');
  process.exit(1);
}

runComposer(['global', 'require', '--', ...specs]); // adapter (win32 では shell: true)
```

`isPlatformPackage` は `php` と `ext-*` を除きます。
Clean Coding として、`toGlobalInstallSpec` は「名前と constraint から Composer に渡す1引数を作る」以外を知りません。
空集合のエラーは application が扱い、Composer の失敗はアダプタが exit code をそのまま返します。

### エッジケース

| ケース | 対応 |
| --- | --- |
| `require` が platform 以外空 | エラー終了 (`exit code: 1`) |
| 自己参照 `stein2nd/global-composer` | 他 pkg と同様に列挙 (自身も再インストール) |
| `php` / `ext-*` | 列挙しない |
| Windows | `shell: true` で `composer.bat` を解決 |
| インストール失敗 | Composer の exit code をそのまま返す |
| CCU プラグイン | COMPOSER_HOME の `allow-plugins.webworkerjoshua/composer-check-updates` を true にする |

## 移行

このリポジトリに v1 / 方式 A 時代はないため、初版から C 型 + overlay です。

| 版 | setup、install 入力 |
| --- | --- |
| v1.0.0 (初版) | 実効 `composer.json` (`$SETUP_DIR/composer.json`) → COMPOSER_HOME |

## 関連ドキュメント

* [cli.md](./cli.md): サブコマンド全体
* [layout.md](./layout.md): overlay manifest ・`$SETUP_DIR` ・`$COMPOSER_HOME`
* [specs.md](./specs.md): レイヤ方針

## ステータス

**草案:** 2026-08-15。姉妹 [install.md](https://github.com/stein2nd/global-npm-setup/blob/main/docs/install.md) を踏襲。
