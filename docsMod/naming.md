# Global Composer Package Setup - 命名

Global Package Setup シリーズにおける、本プロジェクトの名前の決まりです。

## シリーズと本プロジェクト

| レイヤ | 名前 |
| --- | --- |
| シリーズ | Global Package Setup |
| 本プロジェクト (表示名) | Global Composer Package Setup |
| 姉妹プロジェクト | [Global npm Setup](https://github.com/stein2nd/global-npm-setup) (`global-npm-setup`) |
| アプリケーション類型 | CLUI ユーティリティ |

シリーズ名は「グローバルに入れるパッケージを、マニフェストでセットアップする」ことを示します。
パッケージマネージャーごとにリポジトリを分け、CLUI の操作感はそろえます。

## 決定事項

| レイヤ | 決定 |
| --- | --- |
| GitHub リポジトリ名 | `global-composer-setup` |
| ローカル配置 (推奨) | `~/dotfiles/global-composer-setup/` |
| Packagist パッケージ名 | `stein2nd/global-composer` |
| CLUI コマンド名 | `global-composer` (Composer `bin` フィールド) |
| 表示名 (README 等) | Global Composer Package Setup |
| 開発用 npm 名 | リポジトリ内 `package.json` のみ。npmjs には公開しない |

Vite 再構成後も、**リポジトリ名、Packagist 名、コマンド名は変えません。**
変わるのは成果物のパス (`dist/` 配下) です。

## 命名の根拠

### リポジトリ、ディレクトリ: `global-composer-setup`

* 「グローバル Composer パッケージのセットアップ用プロジェクト」であることが伝わる。
* 日常操作で使う CLUI 名 `global-composer` と、リポジトリの役割を分離できる。
* シリーズの姉妹 `global-npm-setup` と、`global-<ecosystem>-setup` で並ぶ。

### Packagist: `stein2nd/global-composer`

* Packagist の vendor は [stein2nd](https://packagist.org/users/stein2nd/packages/) にそろえる。
* 非 vendor 名や `global-composer` 単独は Packagist の命名規則 (`vendor/package`) に合わない。
* コマンド名 `global-composer` とパッケージ名を近付け、インストール後の操作感を姉妹 `global-npm` と一致させる。
* 姉妹の npm スコープ `@s2j` とはレジストリが違うため、無理に `s2j/` にはしない。

### CLUI: `global-composer`

* 姉妹の `global-npm check|update|install|sync|add|list` と同型。
* `~/bin/global-composer` ラッパーは不要 (`composer global require stein2nd/global-composer` で `$COMPOSER_HOME/vendor/bin` に載る)。

## `composer.json` への反映

```json
{
  "name": "stein2nd/global-composer",
  "description": "Manage globally installed Composer packages via composer.json with ccu.",
  "license": "GPL-3.0-or-later",
  "bin": ["bin/global-composer"],
  "require": {
    "php": ">=8.3",
    "webworkerjoshua/composer-check-updates": "^0.0.3"
  }
}
```

`name` と `bin` (コマンド名 `global-composer`) は公開契約です。
`bin/global-composer` が Vite 成果 (`dist/global-composer.js`) を指すか、成果物そのものにするかは実装詳細です。

開発用 `package.json` の想定は、下記です。

```json
{
  "name": "global-composer-setup",
  "private": true,
  "description": "Manage globally installed Composer packages via composer.json with ccu.",
  "engines": {
    "node": ">=18"
  }
}
```

`private: true` を維持し、npmjs には公開しません。配布先は Packagist です ([packagist-publish.md](./packagist-publish.md))。

## ソース上の名前 (FOP)

実装では、次の方針で名前を付けます。

| 対象 | 方針 |
| --- | --- |
| 純関数 | 動詞句 (`mergeRequire`、`toGlobalInstallSpec`) |
| データオブジェクト | 名詞 (`SetupContext`)。クラスにしない |
| ユースケース関数 | サブコマンドに対応 (`handleCheck`、`handleInstall`) |
| アダプタ | I/O が名前から分かる (`readJson`、`runComposer`、`runCcu`) |

Clean Coding どおり、略語やレイヤ名の接頭辞 (`I`、`Impl`、`Service`) は使いません。
姉妹の `mergeDependencies` に相当する関数は、Composer 語彙に合わせて `mergeRequire` / `mergeRequireDev` とします。

## 姉妹との対応

| 姉妹 (npm) | 本プロジェクト |
| --- | --- |
| `global-npm-setup` | `global-composer-setup` |
| `@s2j/global-npm` | `stein2nd/global-composer` |
| `global-npm` | `global-composer` |
| `GLOBAL_NPM_SETUP_DIR` | `GLOBAL_COMPOSER_SETUP_DIR` |

## 未決定、将来検討

* GitHub organization `s2j` 配下に置くか、`stein2nd/global-composer-setup` とするか (現時点では `stein2nd` 想定)。
* dotfiles 内サブモジュール、subtree として管理するか。
* 姉妹 `global-npm-setup` とのドキュメント相互リンクの置き方 (確定後に双方の `docs/` から張る)。

## 関連ドキュメント

* [specs.md](./specs.md): シリーズ位置付けと設計方針
* [layout.md](./layout.md): リポジトリ構成 (Vite)
* [packagist-publish.md](./packagist-publish.md): 公開名と tag

## ステータス

**草案:** 2026-08-15。姉妹 [naming.md](https://github.com/stein2nd/global-npm-setup/blob/main/docs/naming.md) を踏襲。
