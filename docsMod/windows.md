# Global Composer Package Setup - Windows 11

Windows 11での導入と、CLUI 実装上の注意です。

## 背景

姉妹 npm 実装は v2で Windows 11対応を前提にしました。
本プロジェクトは、最初から macOS と Windows 11で同じ `global-composer` フローを使えるようにします。

Global Package Setup シリーズの CLUI は、OS ごとのシェルに依存しません。
Composer 実装の CLUI は Node.js 上で動き、Vite でビルドしてもランタイムは Node のままです。
実環境の操作は Composer (`composer.bat`) に委譲します。

## シェル入口を置かない理由 (Windows)

| 要素 | 置かない | 採用 |
| --- | --- | --- |
| インストールスクリプト | `install-global.zsh` | Node CLUI `global-composer` |
| コマンドラッパー | `~/bin/global-composer` (Zsh) | `composer global require stein2nd/global-composer` |
| パッケージ名の列挙 | `jq` + シェル展開 | JSON を CLUI 内で読む (C 型。**jq 不要**) |
| パッケージマネージャー (OS) | — | winget / scoop 等 (PHP、Composer、Node 導入) |

## Windows 11セットアップ手順 (概要)

### 1. PHP、Composer、Node.js

| ランタイム | 要求 | 導入例 |
| --- | --- | --- |
| PHP | v8.3以上 | [php.net](https://windows.php.net/)、scoop、winget |
| Composer | v2.3以上 | [getcomposer.org](https://getcomposer.org/download/) の Windows インストーラ |
| Node.js | v18以上 | [fnm](https://github.com/Schniz/fnm) (推奨)、[nvm-windows](https://github.com/coreybutler/nvm-windows)、[Volta](https://volta.sh/)、公式インストーラ |

```powershell
php -v
composer --version
node -v
```

### 2. `stein2nd/global-composer` のインストール

```powershell
composer global require stein2nd/global-composer
```

`$COMPOSER_HOME\vendor\bin` を PATH に入れます。場所の確認:

```powershell
composer global config bin-dir --absolute
```

インストールは、初回のみです。以降は `global-composer install` の C 型列挙に `stein2nd/global-composer` 自身も含まれます。

PowerShell を再起動したあと、`global-composer --version` 等で PATH を確認します。

### 3. ユーザー追加分の登録 (任意)

勤務先だけ別 pkg 集合にする場合は、下記のように指定します。

```powershell
global-composer add friendsofphp/php-cs-fixer:^3.64
global-composer sync --dry-run
```

### 4. グローバルパッケージの一括インストール

```powershell
global-composer install
```

実効 `composer.json` の `require` が Composer global project のルート require として入り、各 CLI が `$COMPOSER_HOME\vendor\bin` にリンクされます。

### 5. 更新フロー

```powershell
global-composer check
global-composer update
global-composer install
```

確認だけするときは `global-composer list` を使います。

## パス・ディレクトリ

| 項目 | Windows 11 |
| --- | --- |
| ユーザーホーム | `%USERPROFILE%` (例: `C:\Users\<name>`) |
| setup ディレクトリ (デフォルト) | `%APPDATA%\global-composer` |
| setup 上書き | 環境変数 `GLOBAL_COMPOSER_SETUP_DIR` |
| Composer global project | `%APPDATA%\Composer` (`COMPOSER_HOME` 未設定時) |
| Composer global bin | `%APPDATA%\Composer\vendor\bin` (通常。確認は `composer global config bin-dir --absolute`) |
| dotfiles 推奨配置 (開発) | `%USERPROFILE%\dotfiles\global-composer-setup\` |

overlay manifest のファイル (`user-deps.json`、実効 `composer.json`) は setup ディレクトリに生成されます ([layout.md](./layout.md))。
`COMPOSER_HOME` と setup を同じパスにしないでください。

`global-composer` コマンドは Composer global bin ディレクトリに配置されます。

## CLUI 実装上の Windows 対応

パス解決と spawn は **adapters** に閉じます。domain のマージ純関数は OS を知りません。

| 要件 | 対応 |
| --- | --- |
| シェル非依存 | Node.js の子プロセス API を使用 (Vite バンドル後も同じ) |
| パス区切り | `path.join`、`path.resolve` を使用 |
| shebang | `#!/usr/bin/env node` (Windows では Composer の `bin proxy` / npm と同様に node で実行) |
| 改行コード | リポジトリは LF 統一 (`.gitattributes` 推奨) |
| JSON 列挙 | Node 標準 API (PowerShell、cmd 不要) |

### spawn 時の注意

```ts
const shell = process.platform === 'win32';

runCcu(['--dry-run'], { workingDir: setupDir, shell });

runComposer(['global', 'require', '--', ...specs], { shell });
```

`check`、`update` は `composer check-updates` (グローバルプラグイン) を Composer 経由で起動します。
PATH に単独の `ccu` がなくても、`composer` さえ解決できれば動作する契約にします。
`install` / `list` では `shell: true` により `composer.bat` を解決します。

Vite でバンドルする場合も、**PATH 上の `ccu` を必須にしない** 契約は維持します。

## jq について (Windows)

* **C 型のため、`global-composer` 実行に jq は不要。**
* 手動で一覧を取り込む作業に jq を使う場合は任意 (`winget install jqlang.jq` 等)。
* macOS も同様に、CLUI ランタイム依存は Node + Composer (および PHP) のみ。

## 勤務先環境の制約 (想定)

* 管理者権限なしでの PHP / Composer / Node 導入が可能か事前確認する。
* プロキシ、社内 Packagist / Satis がある場合は COMPOSER_HOME の `config.json` で設定する。
* Git 管理ポリシー: dotfiles を clone するか、`composer global require` のみで完結させるかは環境次第。
* `allow-plugins` を COMPOSER_HOME で許可できるか確認する (CCU 利用時)。

## README への反映

README は、OS 別セクションに分けます。

* **共通:** 概要、`global-composer` コマンド、更新フロー、シリーズ位置付け
* **macOS:** Homebrew (PHP / Composer)、fnm、dotfiles 配置、`COMPOSER_HOME/vendor/bin` の PATH
* **Windows:** PHP、Composer インストーラ、fnm、PowerShell、PATH 確認

## テスト観点

確認項目と OS 別の手順・合否は [test-results.md](./test-results.md) の「実機テスト」節です。
記録の入力は [`test/manual-tests.json`](../test/manual-tests.json) です。

| 確認項目 | ID |
| --- | --- |
| `global-composer check` | HW-01 |
| `global-composer update` | HW-02 |
| `global-composer install` (C 型列挙) | HW-03 |
| `global-composer sync`、`add` | HW-04 |
| `global-composer list` | HW-05 |
| 未知サブコマンドで usage | HW-06 |
| 管理対象 CLI が `$COMPOSER_HOME/vendor/bin` に載る | HW-07 |
| `composer` / `ccu` (`composer check-updates`) が呼べる | HW-08 |
| `path` リポジトリで `@dev` 導入 | HW-09 |

## 関連ドキュメント

* [cli.md](./cli.md): CLUI 仕様
* [layout.md](./layout.md): `$SETUP_DIR` と `$COMPOSER_HOME` のデフォルト
* [legacy-scripts.md](./legacy-scripts.md): Zsh 入口を置かない理由

## ステータス

**草案:** 2026-08-15。姉妹 [windows.md](https://github.com/stein2nd/global-npm-setup/blob/main/docs/windows.md) を踏襲。
