# Global Composer Package Setup - レガシースクリプトを置かない

シェル入口を置かず、CLUI に一本化する理由です。

本リポジトリに v1の Zsh ラッパーはありません。
姉妹 npm 実装が v1の `install-global.zsh` / `~/bin/global-npm` を廃止した判断を、Composer 版では **最初から採用** します。

FOP / Vite 実装は、この一本化を前提に **中身の設計** を整えるものであり、シェルラッパーを後から足しません。

## 背景

Composer にはもともと `composer global require` / `composer global update` / `composer global show` があります。
それを dotfiles の Zsh で包むと、姉妹 v1と同じ問題 (OS 依存、二重入口、PATH 設定) が再発します。

Global Package Setup シリーズでは、パッケージマネージャーごとの入口を **そのエコシステムの標準配布** に載せます。
Composer 実装では `composer global require stein2nd/global-composer` が `$COMPOSER_HOME/vendor/bin` に `global-composer` を置く経路です。

## 置かないもの

| 層 | 置かないファイル | 代わり |
| --- | --- | --- |
| install 専用シェル | `./install-global.zsh` | `global-composer install` |
| オーケストレータ | `~/bin/global-composer` (Zsh) | Composer `bin` の `global-composer` |
| jq 列挙 | `composer global require $(jq …)` | C 型列挙 (CLUI 内) |

`composer.json` の `scripts` を開発用に残すことは妨げません。ユーザー向け入口にはしません。

## シェル入口を置いた場合の利点 (採用しない)

姉妹 v1と同じ利点はあります。採用しない理由のほうが大きいです。

### 単純な install スクリプトの利点

| 利点 | 説明 |
| --- | --- |
| 極めて単純 | 依存は zsh + Composer のみ。 |
| リポジトリ同梱 | Git で追跡。Packagist 不要。 |
| PATH 不要 | `./install-global.zsh` で直接実行できる。 |

### 欠点

| 欠点 | 説明 |
| --- | --- |
| B 型になりやすい | `$SETUP_DIR` で `composer install` すると bin が PATH に載らない ([install.md](./install.md))。 |
| Zsh 専用 | Windows、bash では動かない。 |
| CCU 非連携 | 単体では check、update フローに組み込めない。 |
| 二重入口 | `composer global` 直たたきとスクリプトが並ぶ。 |

### `~/bin/global-composer` ラッパーの欠点

| 欠点 | 説明 |
| --- | --- |
| Zsh 専用 | Windows 非対応。 |
| SETUP_DIR のあいまいさ | ラッパー位置と overlay ディレクトリがずれやすい。 |
| PATH 設定が前提 | `~/.zshrc` 変更が必須。新マシンごとに再設定。 |
| Mac 限定の再現 | 勤務先 Windows 11にはそのまま持ち込めない。 |

## CLUI に統一する利点

| 利点 | 説明 |
| --- | --- |
| OS 非依存 | Node + Composer。macOS、Windows 11で同一。 |
| 入口の一本化 | check、update、install、sync、add、list が1つの CLUI。 |
| C 型 install | 列挙して明示的に COMPOSER_HOME へ入れる。CCU 整合を保ちつつ jq 不要。 |
| setup と実環境の分離 | `$SETUP_DIR` と `$COMPOSER_HOME` を混ぜない。 |
| 標準的な PATH 管理 | `composer global require` が `$COMPOSER_HOME/vendor/bin` に `global-composer` を置く。`~/bin` 不要。 |
| 新マシンセットアップ簡素化 | PHP + Composer + Node + `composer global require stein2nd/global-composer` で開始。 |
| 自己更新が可能 | `stein2nd/global-composer` を `require` に含め、C 型 install で自身も更新。 |
| Composer エコシステム整合 | 他の global ツールと同じ Packagist → `composer global update` フロー。 |
| シリーズ整合 | 姉妹 `global-npm-setup` も「エコシステムの標準 bin」に載せる。 |
| CCU フローの明確化 | `install` から CCU を外し、check → update → install が明示的。 |

FOP + Vite は、この CLUI を **保守しやすい内部構造** にするための方針です。
配布形態 (Composer の `bin`) とユーザーから見たコマンドは維持します。

### トレードオフ

| トレードオフ | 説明 | 受け入れ |
| --- | --- | --- |
| 初回 bootstrap | 先に `composer global require stein2nd/global-composer` が必要 | ◎ |
| Packagist / tag 依存 | 公式一覧の変更は `tag` (または開発時の `path` リポジトリ) が必要 | ◎: [packagist-publish.md](./packagist-publish.md) 参照 |
| ネットワーク | 初回および更新時に Packagist 到達が前提 | ◎ |
| Node ランタイム | CLUI 実行に Node.js v18以上が必要 | ◎: シリーズ実装を共有するため |
| 純 dotfiles からの距離 | 「clone するだけ」より Packagist パッケージとしての運用に寄る | ◎ |
| カスタム一覧 | 勤務先だけ別 pkg 集合にするには fork か overlay が必要 | ◎: overlay manifest (`user-deps.json`) で対応 |

## 横断比較

| 観点 | 仮想 `install-global.zsh` | 仮想 `~/bin/global-composer` | 採用: `stein2nd/global-composer` |
| --- | --- | --- | --- |
| 対応 OS | macOS (Zsh) | macOS (Zsh) | macOS、Windows |
| 入口数 | install のみ (別系統) | 3操作 | 6操作 (CLUI で統一) |
| install 方式 | B 型 (不適) | A 型 (jq、ラッパー経由) | C 型 (列挙) |
| CCU 整合 | ✗ | △ | ◎ |
| setup ディレクトリ解決 | `$0` 基準 | 誤りやすい | ◎ (`$SETUP_DIR`) |
| 新マシンセットアップ | clone + 実行 | clone + ~/bin + zshrc | PHP + Composer + Node + `composer global require` |
| 保守箇所 | zsh (1) | zsh + scripts + jq | CLUI (1)。内部は FOP で分割 |
| Packagist 公開 | 不要 | 不要 | 必要 |

## 決定事項

| 項目 | 判断 |
| --- | --- |
| `install-global.zsh` | **置かない** |
| `~/bin/global-composer` | **置かない** (Composer global `bin` が代替) |
| コマンド名 `global-composer` | **採用** (`stein2nd/global-composer` の `bin` フィールド) |
| 内部実装 | FOP + Vite。シェル入口は追加しない |

### 移行時の注意 (姉妹からの乗り換え)

* Mac 既存環境に `~/bin/global-npm` が残っていても、本コマンドとは別名なので共存できる。
* 同名ファイル `global-composer` が PATH 上で Composer global `bin` より優先されないよう確認する。

## 関連ドキュメント

* [cli.md](./cli.md): CLUI 仕様
* [install.md](./install.md): C 型 install
* [packagist-publish.md](./packagist-publish.md): Packagist 依存の受け入れ理由
* [specs.md](./specs.md): シリーズと設計方針

## ステータス

**草案:** 2026-08-15。姉妹 [legacy-scripts.md](https://github.com/stein2nd/global-npm-setup/blob/main/docs/legacy-scripts.md) を踏襲。
