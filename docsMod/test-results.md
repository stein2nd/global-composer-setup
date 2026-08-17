# Global Composer Package Setup - 仕様準拠テスト結果

最終実行: **2026-08-17**

実行: `npm test`

実機の合否は [`test/manual-tests.json`](../test/manual-tests.json) を更新し、再実行でこのファイルへ反映する。

## サマリー

### 自動テスト

| 区分 | 件数 |
| --- | --- |
| PASS | 61 |
| WARN | 0 |
| PENDING | 0 |
| FAIL | 0 |
| 合計 | 61 |

自動テスト実施率 (PASS + WARN + FAIL / 合計): **100%**

### 実機テスト

| 区分 | 件数 |
| --- | --- |
| PASS | 9 |
| WARN | 0 |
| PENDING | 9 |
| FAIL | 0 |
| 合計 | 18 |

実機テスト実施率 (PASS + WARN + FAIL / 合計): **50%**

件数は OS 別 (macOS / Windows 11) です。

## 結果マーク

* PASS: 条件を満たす
* WARN: 条件未達だが、環境依存などで意図的に許容
* PENDING (自動): 自動テスト未実装
* PENDING (実機): その OS で未実施
* FAIL: 条件未達 (要修正)

## 自動テスト実施済み

| ID | 仕様 | 結果 | 条件 |
| --- | --- | --- | --- |
| NAM-01 | naming | PASS | composer.json の name が `stein2nd/global-composer` であること。 |
| NAM-02 | naming | PASS | composer.json の bin に `bin/global-composer` があること。 |
| NAM-03 | naming | PASS | package.json の name が `global-composer-setup` で、`private` ではないこと。 |
| CLI-01 | cli | PASS | `bin/global-composer` が存在すること。 |
| CLI-02 | cli | PASS | bin 先頭行が `#!/usr/bin/env node` であること。 |
| CLI-05 | cli | PASS | JSON 処理が `JSON.parse` であること。 |
| CLI-06 | cli | PASS | ソースに jq 呼び出しが含まれないこと。 |
| CLI-07 | cli | PASS | package root は upstream 正本、`defaultSetupDir()` で overlay setup を解決すること。 |
| CLI-08 | cli | PASS | `GLOBAL_COMPOSER_SETUP_DIR` で setup ディレクトリを上書きできること。 |
| CLI-11 | cli | PASS | サブコマンド未指定時に usage を表示して exit 1 すること。 |
| CLI-12 | cli | PASS | 未知サブコマンド時に usage を表示して exit 1 すること。 |
| CLI-17 | cli | PASS | `add` が `user-deps.json` の require に追記すること。 |
| CLI-18 | cli | PASS | `add --dev` が `user-deps.json` の require-dev に追記すること。 |
| CLI-19 | cli | PASS | `sync` が upstream require と自己参照を実効 composer.json に反映すること。 |
| CLI-20 | cli-list | PASS | `list` が `composer global show` を spawn すること。 |
| CLI-21 | cli-list | PASS | `list` の実装が `syncManifest` / `prepare` を呼ばないこと。 |
| CLI-22 | cli-list | PASS | `usage` 文字列に `list` が含まれること。 |
| CLI-23 | cli-list | PASS | `list` が `COMPOSER_HOME` を1行目に出すこと。 |
| INS-01 | install | PASS | install が `composer global require` に列挙 spec を渡すこと。 |
| INS-04 | install | PASS | packages が空のとき `No packages to install.` で exit 1 すること。 |
| INS-05 | install | PASS | install 単体で CCU を呼ばないこと。 |
| LAY-10 | layout | PASS | setup ディレクトリ名が `global-composer` であること。 |
| LAY-11 | layout | PASS | 実効マニフェストが `$SETUP_DIR/composer.json` であること。 |
| LAY-12 | layout | PASS | user-deps と meta が setup 配下であること。 |
| LIC-01 | license | PASS | composer.json と package.json の license が GPL-3.0-or-later であること。 |
| LIC-02 | license | PASS | LICENSE ファイルが存在すること。 |
| CLI-09 | cli | PASS | check が `composer check-updates --dry-run` を `--working-dir=$SETUP_DIR` で呼ぶこと。 |
| CLI-10 | cli | PASS | update が CCU `--format json` で constraint を書き、`composer global update` を呼ばないこと。 |
| CLI-16 | cli | PASS | check 実行後もリポジトリ root の composer.json が変わらないこと。 |
| INS-02 | install | PASS | install が `$SETUP_DIR` を COMPOSER_HOME にする B 型を採らないこと。 |
| INS-03 | install | PASS | install が require を `Object.entries` で列挙すること。 |
| INS-06 | install | PASS | spawn 時に Windows 向け `shell: process.platform === "win32"` を使うこと。 |
| INS-07 | install | PASS | 子プロセス (Composer) の exit code をそのまま返すこと。 |
| LAY-08 | layout | PASS | install が require-dev を列挙しないこと。 |
| LAY-09 | layout | PASS | 公式一覧に自己参照 `stein2nd/global-composer` が含まれること。 |
| LEG-01 | legacy-scripts | PASS | `install-global.zsh` がリポジトリに存在しないこと。 |
| LEG-02 | legacy-scripts | PASS | `~/bin/global-composer` 用の Zsh ラッパーを同梱しないこと。 |
| WIN-01 | windows | PASS | パス解決が `path.join` / `path.resolve` であること。 |
| WIN-02 | windows | PASS | spawn 時に Windows 判定付き shell オプションを使うこと。 |
| WIN-03 | windows | PASS | CLUI ソースに Zsh 依存が含まれないこと。 |
| E2E-01 | overlay-manifest | PASS | サンドボックス `SETUP_DIR` と `COMPOSER_HOME` で `sync` → `install` すること。 |
| E2E-02 | cli | PASS | サンドボックスで `check` (CCU `--dry-run`) が動くこと。 |
| E2E-03 | cli | PASS | サンドボックスで `update` が実効 composer.json だけを書き換えること。 |
| E2E-04 | cli-list | PASS | `list` が `COMPOSER_HOME=` 行と `composer global show` を実実行すること。 |
| E2E-05 | install | PASS | install 後に bin がサンドボックス `COMPOSER_HOME/vendor/bin` に載ること。 |
| E2E-06 | usage | PASS | 定番フロー `check` → `update` → `install` をサンドボックスで通すこと。 |
| SYNC-01 | overlay-manifest | PASS | user-only require が upstream 更新後も維持されること。 |
| SYNC-02 | overlay-manifest | PASS | 未 update の upstream パッケージが新 constraint に追従すること。 |
| SYNC-03 | overlay-manifest | PASS | update 済み constraint が維持されること。 |
| SYNC-04 | overlay-manifest | PASS | user-deps ピンが upstream より優先されること。 |
| SYNC-05 | overlay-manifest | PASS | upstream 削除 (upstream 管理) が実効 composer.json から消えること。 |
| SYNC-06 | overlay-manifest | PASS | upstream 削除後も user 追加分が維持されること。 |
| SYNC-07 | overlay-manifest | PASS | user-deps require-dev が実効 composer.json にマージされること。 |
| SYNC-08 | overlay-manifest | PASS | upstream require-dev が実効 composer.json に含まれないこと。 |
| SYNC-09 | overlay-manifest | PASS | user-deps から消した require-dev が実効 composer.json からも消えること。 |
| SYNC-10 | overlay-manifest | PASS | CCU update 済み require-dev が維持されること。 |
| SYNC-11 | overlay-manifest | PASS | php が常に >=8.3 で user-deps より優先されること。 |
| RANGE-01 | overlay-manifest | PASS | composer show --available 成功時に ^x.y.z を返すこと。 |
| RANGE-02 | overlay-manifest | PASS | 取得失敗時に * と warning を返すこと。 |
| RANGE-03 | overlay-manifest | PASS | vendor/package 形式でない名前が無効になること。 |
| ENV-01 | runtime | PASS | PATH 上に composer があること (実機確認)。 |

## 自動テスト残項目

残項目はありません。

## 実機テスト実施済み

| ID | OS | 仕様 | 結果 | 条件 | 確認方法 | 記録 |
| --- | --- | --- | --- | --- | --- | --- |
| HW-01 | macOS | windows | PASS | `global-composer check` が実環境で動くこと。 | `global-composer check` → 終了 0。`git diff -- composer.json` が空。 | 2026-08-15 / 終了 0。All dependencies match the latest available versions。repo composer.json 未変更。root-version 警告あり。 |
| HW-02 | macOS | windows | PASS | `global-composer update` が実効 composer.json だけを書き換えること。 | `global-composer update` → 終了 0。変わるのは `~/.config/global-composer/composer.json` だけ。 | 2026-08-15 / 終了 0。最新のため制約変更なし。user-deps / COMPOSER_HOME / repo 未変更。 |
| HW-03 | macOS | windows | PASS | `global-composer install` (C 型) が COMPOSER_HOME に入ること。 | `global-composer install` → 終了 0。`composer global show` に公式 require と user-deps が出る。 | 2026-08-15 / 終了 0。C 型で php-cs-fixer 3.95.18 / global-composer 1.0.0 (path) / CCU 0.0.3 が COMPOSER_HOME に入った。 |
| HW-04 | macOS | windows | PASS | `global-composer add` と `sync` が setup 配下だけを更新すること。 | `global-composer add friendsofphp/php-cs-fixer:^3.64` のあと `~/.config/global-composer/user-deps.json` を見る。`global-composer sync --dry-run` が差分を出す。 | 2026-08-15 / user-deps に php-cs-fixer:^3.64。sync --dry-run は No changes。repo / COMPOSER_HOME は未変更。 |
| HW-05 | macOS | cli-list | PASS | `global-composer list` が COMPOSER_HOME 行と `composer global show` を出すこと。 | `global-composer list` の1行目が `COMPOSER_HOME=`。続きが `composer global show` と一致。 | 2026-08-15 / COMPOSER_HOME=/Users/stein/.composer。一覧は composer global show と一致。 |
| HW-06 | macOS | windows | PASS | サブコマンドなし / 未知サブコマンドで usage を出して終了 1 であること。 | `global-composer; echo $?` と `global-composer nosuch; echo $?` が 1。usage が出る。 | 2026-08-15 / 引数なしと nosuch の両方で Usage、終了 1。 |
| HW-07 | macOS | windows | PASS | 管理対象 CLI が `$COMPOSER_HOME/vendor/bin` に載ること。 | `ls "$(composer global config home --absolute)/vendor/bin"` に `global-composer`。`command -v global-composer` が通る。 | 2026-08-15 / ~/.composer/vendor/bin に global-composer / ccu / laravel。command -v 一致。 |
| HW-08 | macOS | windows | PASS | `composer` と CCU (`composer check-updates`) が呼べること。 | `composer --version` と `composer check-updates --help` が通る。 | 2026-08-15 / Composer 2.10.2 / PHP 8.5.9。CCU ヘルプに --dry-run と --format あり。 |
| HW-09 | macOS | install | PASS | path リポジトリで `stein2nd/global-composer:@dev` を入れ、CLI が呼べること。 | `composer global config repositories.gcs path "$PWD"` → `composer global require stein2nd/global-composer:@dev` → `global-composer` で usage。 | 2026-08-15 / path @dev (dev-main)。PHP 8.5.9 / Composer 2.10.2。Usage で終了 1。 |

## 実機テスト残項目

| ID | OS | 仕様 | 結果 | 条件 | 確認方法 | 記録 |
| --- | --- | --- | --- | --- | --- | --- |
| HW-01 | Windows 11 | windows | PENDING | `global-composer check` が実環境で動くこと。 | PowerShell で `global-composer check` → 終了 0。`git diff -- composer.json` が空。 | — |
| HW-02 | Windows 11 | windows | PENDING | `global-composer update` が実効 composer.json だけを書き換えること。 | `global-composer update` → 終了 0。変わるのは `%APPDATA%\global-composer\composer.json` だけ。 | — |
| HW-03 | Windows 11 | windows | PENDING | `global-composer install` (C 型) が COMPOSER_HOME に入ること。 | PowerShell で `global-composer install` → 終了 0。続けて `composer global show`。 | — |
| HW-04 | Windows 11 | windows | PENDING | `global-composer add` と `sync` が setup 配下だけを更新すること。 | 同じコマンド。確認先は `%APPDATA%\global-composer\user-deps.json`。 | — |
| HW-05 | Windows 11 | cli-list | PENDING | `global-composer list` が COMPOSER_HOME 行と `composer global show` を出すこと。 | PowerShell で同じ比較。 | — |
| HW-06 | Windows 11 | windows | PENDING | サブコマンドなし / 未知サブコマンドで usage を出して終了 1 であること。 | `global-composer; echo $LASTEXITCODE` と `global-composer nosuch; echo $LASTEXITCODE` が 1。 | — |
| HW-07 | Windows 11 | windows | PENDING | 管理対象 CLI が `$COMPOSER_HOME/vendor/bin` に載ること。 | `composer global config bin-dir --absolute` の先に `global-composer.bat`。`Get-Command global-composer`。 | — |
| HW-08 | Windows 11 | windows | PENDING | `composer` と CCU (`composer check-updates`) が呼べること。 | PowerShell で同じ2コマンド。 | — |
| HW-09 | Windows 11 | install | PENDING | path リポジトリで `stein2nd/global-composer:@dev` を入れ、CLI が呼べること。 | `composer global config repositories.gcs path "$((Get-Location).Path)"` のあと、同じ `require` と `global-composer`。 | — |

