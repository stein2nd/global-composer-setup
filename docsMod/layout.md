# Global Composer Package Setup - 配置

overlay manifest とリポジトリ配置です。

## 背景

姉妹 npm 実装は、v2.1以降 **方式 B: overlay manifest** を採用しています。
本プロジェクトは最初から同じ方式を採り、公式一覧と利用側の追加分を分けます。

ソース配置は **Vite + FOP** に合わせます。配布は Packagist です。

## 方式の比較

| | 方式 A: パッケージ同梱のみ | 方式 B: overlay manifest (採用) |
| --- | --- | --- |
| 配置 | `stein2nd/global-composer` 内の `composer.json` のみ | upstream 正本 + `$SETUP_DIR` の実効 `composer.json` |
| 更新 | `composer global update stein2nd/global-composer` で upstream 更新 | sync が upstream を実効 `composer.json` に反映 |
| Mac、Windows 同期 | upstream を Packagist tag で同期 | upstream + 同一 `$SETUP_DIR` 構成で同期 |
| カスタム | fork が必要だった | `user-deps.json`、`global-composer add` で追記 |
| 複雑さ | 低 | 中 |

## 決定事項

**方式 B: overlay manifest** を採用する。

### 根拠

* 自宅 macOS と勤務先 Windows 11で **upstream 公式一覧** を `composer global update` で同期できる。
* 勤務先だけ別 pkg 集合にしたい要件に、`user-deps.json` で対応できる。
* upstream 更新時にユーザー追加分を消さず、未 update の upstream 管理分は新 constraint に追従できる。
* 姉妹 `global-npm-setup` と同じ管理モデルを、Composer 語彙で共有できる。

### レイヤの役割 (マニフェスト)

| レイヤ | パス | 更新者 | 用途 |
| --- | --- | --- | --- |
| Upstream 正本 | `<packageRoot>/composer.json` | Packagist (Git tag) | 公式 `require` 一覧 |
| ユーザー overlay | `$SETUP_DIR/user-deps.json` | ユーザー、`global-composer add` | 追加分、ピン留め |
| 実効 `composer.json` | `$SETUP_DIR/composer.json` | CLI `sync` | CCU、install の実効マニフェスト |
| Meta | `$SETUP_DIR/.upstream-meta.json` | CLI `sync` | 差分検出用スナップショット |

`packageRoot` は CLUI が属する `stein2nd/global-composer` のインストール先です。
実行ファイルからの相対ではなく **パッケージ root** を adapters が解決します。

開発用 `package.json` は Node / Vite ツールチェイン専用であり、upstream 正本ではありません。

### 実環境 (COMPOSER_HOME)

| レイヤ | パス | 更新者 | 用途 |
| --- | --- | --- | --- |
| Composer global project | `$COMPOSER_HOME/composer.json` | `install` (Composer) | 実インストール、lock、vendor |
| Global bin | `$COMPOSER_HOME/vendor/bin` | Composer | `global-composer`、各ツールの CLI |

**`$SETUP_DIR` と `$COMPOSER_HOME` は別ディレクトリです。**
`COMPOSER_HOME` は Composer が決めます (`composer global config home`)。本ツールは上書きしません。

## setup ディレクトリ (`$SETUP_DIR`)

### デフォルト

| OS | パス |
| --- | --- |
| macOS、Linux | `~/.config/global-composer` |
| Windows 11 | `%APPDATA%\global-composer` |

### 環境変数

| 変数 | 用途 |
| --- | --- |
| `GLOBAL_COMPOSER_SETUP_DIR` | デフォルト setup ディレクトリを上書き |
| `COMPOSER_HOME` | Composer が解釈する global project。本ツールは読んでも、setup には使わない |

```ts
const setupDir = path.resolve(
  process.env.GLOBAL_COMPOSER_SETUP_DIR?.trim() || defaultSetupDir(),
);
```

### ファイル構成

```
~/.config/global-composer/     # または GLOBAL_COMPOSER_SETUP_DIR
├── user-deps.json             # ユーザー追加分・ピン留め
├── composer.json              # 実効 composer.json (CCU、install 入力)
└── .upstream-meta.json        # 同期メタ (ユーザー環境のみ)
```

`update` が CCU `--all` を `$SETUP_DIR` で走らせた場合、`vendor/` や `composer.lock` がここにできることがあります。
それらは実環境ではありません。gitignore 相当で無視してよいです。

### `user-deps.json`

```json
{
  "require": {
    "friendsofphp/php-cs-fixer": "^3.64"
  },
  "require-dev": {
    "phpstan/phpstan": "^2.0"
  }
}
```

* キー名は Composer 語彙 (`require` / `require-dev`) です。姉妹の `dependencies` / `devDependencies` に対応します。
* upstream に存在するパッケージ名でも `require` に書けば、**ピン留め:** 最優先。
* `require-dev` は実効 `composer.json` にマージするが、global install 対象外 ([install.md](./install.md))。

### 実効 `composer.json`

```json
{
  "name": "global-composer/user-manifest",
  "description": "Effective Composer global manifest (generated)",
  "require": {
    "php": ">=8.3"
  },
  "require-dev": {}
}
```

`name` は固定値 `global-composer/user-manifest` です。Composer の `vendor/package` 正規表現を満たし、CCU が読める最小構成とします。
`require.php` はランタイム契約 (`>=8.3`) を固定し、install 列挙からは外します。

## マージ仕様 (`syncManifest`)

`check`、`update`、`install`、`sync`、`add` 実行時に upstream + `user-deps.json` から実効 `composer.json` を再生成します。

マージ判断 (`mergeRequire`、`mergeRequireDev`) は **ドメインの純関数** です。
ファイルの読み書きとディレクトリ作成はアダプタです。`syncManifest` はその合成 (application) です。

### `require` の優先順位: 高い順

1. `user-deps.json` の `require` にキーがある → その constraint にピン留め。
2. 実効 `composer.json` の値が前回 upstream と異なる → `global-composer update` 済みとみなし維持。
3. それ以外 → 新 upstream の constraint で上書き。未 update 追従。

`php` は常に `>=8.3` を採用します (ユーザーピンよりランタイム契約を優先)。

### upstream から削除されたパッケージ

| 種別 | 扱い |
| --- | --- |
| ユーザー追加分 | 実効 `composer.json` に維持 |
| upstream 管理分 | 実効 `composer.json` から削除 |

### `require-dev`: B 案

* upstream の `require-dev` は実効 `composer.json` に含めない。リポジトリ開発用ツールをユーザー環境に流さない。
* `user-deps.json` の `require-dev` のみをマージする。

詳細なマージ手順・実行フローは [overlay-manifest.md](./overlay-manifest.md) をご覧ください。

## リポジトリ構成 (開発)

```
global-composer-setup/
├── src/
│   ├── cli/               # argv、usage、エントリ
│   ├── application/       # サブコマンド相当のユースケース関数
│   ├── domain/            # 純関数 (merge、spec 組み立て)
│   └── adapters/          # fs、spawn、paths、CCU / Composer
├── dist/                  # Vite ビルド成果 (bin が指す)
├── bin/                   # Composer が公開するコマンド (成果へのラッパー可)
├── vite.config.ts
├── package.json           # Node / Vite 開発用 (private、engines.node >=18)
├── composer.json          # upstream 正本 + Packagist 定義 + bin
├── LICENSE
├── README.md
├── docs/                  # 確定仕様 (確定後)
└── docsMod/               # 改修中の進行記録 / 草案
```

Clean Architecture のフルセット (entities / use-cases / interface-adapters / frameworks の機械的分割) は採用しません。
上の4ディレクトリは、CLUI に必要な依存の向きを固定するための最小構成です。

### upstream `composer.json` の役割

| フィールド | 用途 |
| --- | --- |
| `name` | `stein2nd/global-composer` |
| `bin` | `global-composer` コマンド |
| `require` | 公式グローバルインストール対象 + `php: >=8.3` |
| `require-dev` | リポジトリ開発用。実効マニフェストに流さない |

`stein2nd/global-composer` 自身も `require` に含めます (自己参照)。

### 自己参照の constraint

Composer は root パッケージが自分自身を `require` することを拒否します (`Root package cannot require itself`)。
そのため自己参照は `require` ではなく `extra.global-composer.require` に置き、CLUI が公式一覧へ合成します。

`stein2nd/global-composer` の constraint は、**Packagist 済みの最新バージョン** を `^x.y.z` で明示します。

| タイミング | 記載する constraint |
| --- | --- |
| 開発中 (未 tag の版に上げ済み) | `^<前回 tag 版>` |
| tag / Packagist 反映直後 | `^<いま公開した版>` に更新 |

* `dev-main` や `*` は使いません (`check`、`update` の CCU、`sync` のマージ判定との相性のため)。
* 確認: `composer show stein2nd/global-composer --available`

## ローカル開発配置

| 環境 | 推奨パス |
| --- | --- |
| macOS | `~/dotfiles/global-composer-setup/` |
| Windows 11 | `%USERPROFILE%\dotfiles\global-composer-setup\` |

開発時は `GLOBAL_COMPOSER_SETUP_DIR` を `.sandbox/setup` 等に向けて overlay を検証します。

```sh
composer global config repositories.global-composer-setup path "$(pwd)"
composer global require stein2nd/global-composer:@dev
GLOBAL_COMPOSER_SETUP_DIR=.sandbox/setup global-composer sync
```

Vite 再構成後は、`link` / `path` リポジトリの前にビルド (または `watch`) が必要になります。手順は実装時に README に落とします。

## Packagist 公開時の注意

* tag のツリーに実行に必要な成果物 (`dist/` または `bin/`) と `composer.json` が含まれることを確認する。
* 公開される `composer.json` は **upstream 正本**。ユーザーの実効 `composer.json` は各環境の `$SETUP_DIR` に生成される。
* `package.json` は npmjs に出さない。

## 関連ドキュメント

* [specs.md](./specs.md): 設計方針
* [overlay-manifest.md](./overlay-manifest.md): マージ詳細
* [packagist-publish.md](./packagist-publish.md): `bin` と tag

## ステータス

**草案:** 2026-08-15。姉妹 [layout.md](https://github.com/stein2nd/global-npm-setup/blob/main/docs/layout.md) を踏襲。
