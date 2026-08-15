# Global Composer Package Setup - Usage

利用側がグローバル Composer パッケージの **鮮度** (バージョン制約と実インストール) を管理するための使い方です。

`global-composer` は Global Package Setup シリーズの **CLUI ユーティリティ** です。
姉妹 `global-npm` と同じく、`check`、`update`、`install`、`add`、`sync`、`list` の役割を整理します。

関連: [layout.md](./layout.md) (ファイル構成)、[cli.md](./cli.md) (サブコマンド仕様)

内部の FOP / Vite 実装があっても、このページの操作契約は維持します。

## 何を管理しているか

一覧は次の2ヵ所に分かれます。

| 種別 | 置き場所 | 誰が更新するか |
| --- | --- | --- |
| **upstream 管理分** | `stein2nd/global-composer` 同梱の公式 `composer.json` | `composer global update stein2nd/global-composer` で取り込む |
| **利用側の追加分** | `~/.config/global-composer/user-deps.json` 等 | `global-composer add` または手編集 |

`check`、`update`、`install` が読むのは、これらをマージした **実効 `composer.json`** (`$SETUP_DIR/composer.json`) です。
鮮度管理は「実効 `composer.json` の constraint を最新に保ち、`install` で Composer global project (`COMPOSER_HOME`) に反映する」ことと認識してください。

`$SETUP_DIR` は宣言の置き場、`$COMPOSER_HOME` は実環境です。混ぜません。

## コマンドと鮮度への役割

| コマンド | 主な役割 (鮮度の観点) | Composer 側の主な実体 |
| --- | --- | --- |
| `check` | 実効 `composer.json` を前提に、更新候補を **確認するだけ** (constraint は変えない) | `composer check-updates --dry-run` |
| `update` | 実効 `composer.json` の constraint を CCU で **最新に書き換える** | CCU (書き換え)。`composer global update` はしない |
| `install` | 実効 `composer.json` の `require` を **global project に実インストール** | `composer global install` / `composer global require` |
| `add` | 追加分を `user-deps.json` に登録し、実効 `composer.json` を更新 | `composer global require` 相当 (登録のみ) |
| `sync` | upstream + 追加分をマージし、実効 `composer.json` を **再生成** | なし (マージのみ) |
| `list` | 実際の global project を **確認** | `composer global show` |

### 定番フロー: `check` → `update` → `install`

```sh
global-composer check
global-composer update
global-composer install
```

| 段階 | やること | 鮮度への意味 |
| --- | --- | --- |
| `check` | Packagist 上の新しい版があるか表示 | 「何が古いか」を把握。ファイルは (CCU 以外は) 変えない。 |
| `update` | 実効 `composer.json` の constraint を更新 | 「次に入れる版」の **宣言** を新しくする。 |
| `install` | constraint どおり COMPOSER_HOME に一括投入 | 宣言どおり **実際の global 環境** を更新する。 |

姉妹の `ncu:check`、`ncu:update`、install 部分と同じ考え方です。
違いは、操作対象が npm の実効 `package.json` ではなく **実効 `composer.json`** で、実環境が `COMPOSER_HOME` である点です。

`install` だけでは constraint は上がりません。`update` だけでは global 環境は変わりません。
鮮度を保つには、通常は3つをこの順で使います。

### `add`: 追加分の登録

利用側だけが使いたいパッケージを **追加分** として登録します。

```sh
global-composer add friendsofphp/php-cs-fixer:^3.64
global-composer add phpstan/phpstan          # constraint 省略時は Packagist → ^x.y.z (失敗時は *)
global-composer add phpunit/phpunit --dev    # require-dev (CCU 対象、install はしない)
```

| 項目 | 内容 |
| --- | --- |
| 書き込み先 | `user-deps.json`。 |
| その後 | 内部で `sync` が走り、実効 `composer.json` に反映。 |
| `install` | **自動では実行しない**。global に入れるには続けて `global-composer install`。 |

追加分の **初回登録** に使います。すでに一覧にあるパッケージの constraint を CCU で上げるのは `update` の仕事です。

### `sync`: 実効 `composer.json` の再生成

upstream 正本と `user-deps.json` をマージし、実効 `composer.json` を作り直します。

```sh
global-composer sync
global-composer sync --dry-run   # 書き込みなしで差分だけ表示
```

| 使う場面 | 例 |
| --- | --- |
| マージ結果だけ確認したい | `sync --dry-run` |
| `user-deps.json` を手編集した直後 | `sync` (または次の `check` 等で自動 sync) |
| upstream を取り込んだ直後で、中身を確定させたい | `composer global update stein2nd/global-composer` のあと |

`sync` 単体では CCU も `composer global install` も走りません。**一覧の合成** だけです。

### `list`: global 環境の確認

実際に Composer global project に入っているパッケージを、`composer global show` と同じ形式で表示します。

```sh
global-composer list
```

| 項目 | 内容 |
| --- | --- |
| 読む対象 | 現在の Composer が指す **`$COMPOSER_HOME`** 配下の実インストール。 |
| 読まない対象 | 実効 `composer.json` (`$SETUP_DIR/composer.json`)。manifest 上の管理対象の一覧ではない。 |
| 事前 `sync` | **なし** (ファイルは変更しない) |
| 定番フロー | **含めない** (`check` → `update` → `install` とは独立) |

出力1行目は `COMPOSER_HOME=…` です (どの global project を見ているかの確認に使います)。

```
COMPOSER_HOME=/Users/ユーザー名/.composer
friendsofphp/php-cs-fixer 3.64.0 PHP Coding Standards Fixer
stein2nd/global-composer 1.0.0 Manage globally installed Composer packages via composer.json with ccu.
webworkerjoshua/composer-check-updates 1.x.x Interactive dependency update checker for Composer
```

| 使う場面 | 例 |
| --- | --- |
| `install` 後の反映確認 | 定番フロー後に、global に入ったバージョンを目視する。 |
| PHP / Composer 切り替え後 | 意図した `COMPOSER_HOME` を見ているか確認する。 |
| manifest と実環境の切り分け | `check` の結果と global 実体が食い違うとき、まず `list` で実態を把握する。 |

実効 `composer.json` に書いてある内容と global 実体を **突き合わせたい** ときは、`list` で実態を確認してから `check` や `sync --dry-run` を使います。

## 毎回、明示的に `sync` を実行する必要があるか

**通常は不要です。**

次のコマンドは実行前に自動で `sync` します。

* `check`
* `update`
* `install`
* `add` (追記のあと)

したがって、定番の鮮度更新は、下記だけで足ります。

```sh
global-composer check
global-composer update
global-composer install
```

**明示的な `sync` が向くのは、下記のときです。**

* マージ差分を **dry-run で確認** したい (`sync --dry-run`)
* `user-deps.json` をエディターで編集し、`check` 等をまだ実行していない
* upstream 取り込み後、実効 `composer.json` の中身だけ先に確定させたい

`composer global update stein2nd/global-composer` だけ実行して CLI をまだ触っていない場合も、次の `check` (など) のときに自動 sync されるため、必ずしも `sync` 単体実行はいりません。

## upstream 管理分と追加分の衝突

同じパッケージ名が upstream と追加分の両方に関わるとき、マージ規則は次のとおりです。姉妹と同じ優先順位です。

### 優先順位 (高い順)

1. **`user-deps.json` に同名がある** → その constraint で **ピン留め** (upstream の新 constraint より優先)
2. **実効 `composer.json` が前回 upstream と異なる** → `global-composer update` 済みとみなし **維持**
3. **それ以外** → upstream の新 constraint で **上書き** (未 `update` の追従)

### 起こりうるパターン

| 状況 | 結果 |
| --- | --- |
| 追加分だけのパッケージ (`phpstan/phpstan` 等) | upstream 更新でも **消えない** |
| upstream 管理分で、まだ `update` していない | upstream 更新後の最初の `check` 等で **新 constraint に追従** |
| upstream 管理分で、すでに `update` 済み | 利用側が選んだ constraint を **維持** |
| upstream 公式一覧から削除された (upstream 管理だった) | 実効 `composer.json` から **削除** |
| upstream から削除されたが、追加分として `user-deps` に残している | **維持** |
| upstream パッケージを古い版に固定したい | `user-deps.json` に同名で constraint を書く (ピン留め) |

### 衝突を避けるコツ

* **追加分だけ** にしたいパッケージ → `global-composer add` で `user-deps.json` に載せる
* **upstream 公式と同じ名前** を追加分に書く → ピン留めになる。意図的でなければ避ける
* upstream 更新後に「公式の新 constraint に乗せたい」→ `user-deps` からその名前を外し、`check` → `update` → `install`
* 「自分で `update` した constraint を維持したい」→ そのまま `check` → `install` (`update` は不要な場合も)

## よくあるシナリオ

### 定期メンテナンス (姉妹と同じ)

```sh
global-composer check
global-composer update
global-composer install
```

### 初めて追加分を入れる

```sh
global-composer add friendsofphp/php-cs-fixer:^3.64
global-composer install
```

### `stein2nd/global-composer` 本体を upstream 更新したあと

```sh
composer global update stein2nd/global-composer
global-composer check      # 内部で sync。未 update 分は新 upstream に追従
global-composer update     # 必要なら
global-composer install
```

### upstream 取り込み前に差分だけ見る

```sh
composer global update stein2nd/global-composer
global-composer sync --dry-run
```

### global に何が入っているか確認する

```sh
global-composer list
```

`install` 直後など、**実際の Composer global 環境** を確認するときに使います。詳細は上記 [`list`](#list-global-環境の確認) をご覧ください。

## 関連ドキュメント

* [layout.md](./layout.md): 実効 `composer.json`、`user-deps.json`、マージ仕様
* [cli.md](./cli.md): 各サブコマンドの実装詳細
* [install.md](./install.md): `install` が `require` のみを対象とする理由
* [specs.md](./specs.md): シリーズと設計方針

## ステータス

**草案:** 2026-08-15。姉妹 [usage.md](https://github.com/stein2nd/global-npm-setup/blob/main/docs/usage.md) を踏襲。
