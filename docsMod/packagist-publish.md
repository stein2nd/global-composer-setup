# Global Composer Package Setup - Packagist 公開

`stein2nd/global-composer` の公開方針です。

姉妹の npm 公開 ([npm-publish.md](https://github.com/stein2nd/global-npm-setup/blob/main/docs/npm-publish.md)) に相当します。
配布先を npmjs ではなく [Packagist](https://packagist.org/users/stein2nd/packages/) にするため、ファイル名は `packagist-publish.md` とします。

## 背景

Global Package Setup シリーズでは、各エコシステムの標準レジストリから CLUI を配ります。
Composer 実装の配布物は Packagist です。姉妹 `global-npm-setup` の配布先は npmjs です。

Packagist は `npm publish` のような tarball アップロードではありません。
**Git リポジトリの tag をクロール** してバージョンを作ります。
そのため「GitHub に tag を push し、Release を切ったら、[stein2nd の packages リスト](https://packagist.org/users/stein2nd/packages/) に載る」を正規の公開経路とします。

Vite 再構成後は、tag のツリーに実行可能な bin を含めます。
パッケージ名、コマンド名、tag → Packagist の流れは維持します。

## 決定事項

| 項目 | 決定 |
| --- | --- |
| Packagist パッケージ名 | `stein2nd/global-composer` |
| 公開 | 公開 (Packagist に submit) |
| vendor | `stein2nd` |
| 初回バージョン | 1.0.0 (姉妹 v2.2相当の振る舞い) |
| レジストリ | https://packagist.org |
| バージョンの正本 | **Git tag** (`vX.Y.Z` または `X.Y.Z`)。`composer.json` に `version` は書かない |
| ビルド | Vite で `dist/` を生成してから tag / Release |

## 名称の可用性

| 名称 | 状態 |
| --- | --- |
| `stein2nd/global-composer` | 未登録想定。初回 submit で確保する |
| `global-composer` (vendor なし) | Packagist では使用不可 |
| `global-composer-setup` | リポジトリ名として使用 |

maintainer: `stein2nd` (Packagist / GitHub 同一)。

## `composer.json` (公開用)

```json
{
  "name": "stein2nd/global-composer",
  "description": "Manage globally installed Composer packages via composer.json with ccu.",
  "type": "library",
  "license": "GPL-3.0-or-later",
  "bin": ["bin/global-composer"],
  "authors": [
    {
      "name": "Koutarou ISHIKAWA",
      "email": "stein2nd@gmail.com"
    }
  ],
  "homepage": "https://github.com/stein2nd/global-composer-setup",
  "support": {
    "issues": "https://github.com/stein2nd/global-composer-setup/issues",
    "source": "https://github.com/stein2nd/global-composer-setup"
  },
  "keywords": [
    "composer",
    "global",
    "packages",
    "setup",
    "ccu",
    "composer-check-updates",
    "clui"
  ],
  "require": {
    "php": ">=8.3",
    "webworkerjoshua/composer-check-updates": "^0.0.3"
  },
  "extra": {
    "global-composer": {
      "upstream-version": "1.0.0",
      "require": {
        "stein2nd/global-composer": "^1.0.0"
      }
    }
  }
}
```

* `require.php` はプラットフォーム要求です。C 型 install の列挙対象外です ([install.md](./install.md))。
* `require` のその他は **公式グローバルインストール対象** (upstream 正本) です。CCU を含めます (`check` / `update` の実体)。
* 自己参照 `stein2nd/global-composer` は Composer が root の自己 require を拒否するため、`extra.global-composer.require` に置き、CLUI が公式一覧へ合成します。
* `.gitattributes` の `export-ignore` で、docs / tests / 開発用ファイルを配布物から外してよいです。GPL 対応として `src/` を残すかは [license.md](./license.md) を参照してください。

開発用 `package.json` は npmjs に出しません。`private: true` と `engines.node: >=18` だけを持ちます。

## 初回 submit (一度だけ)

1. root に上記の `composer.json` をコミットする。
2. [packagist.org](https://packagist.org) に GitHub アカウント (`stein2nd`) でログインする。
3. Submit → リポジトリ URL `https://github.com/stein2nd/global-composer-setup` を登録する。
4. GitHub Hook が有効か、[packages リスト](https://packagist.org/users/stein2nd/packages/) で確認する。警告があればアカウント再同期、または手動 webhook を置く。

これ以降のバージョン追加に、Packagist 側の再 submit は不要です。

## GitHub Hook (自動更新)

Packagist は push (tag を含む) を受け取ると、リポジトリをクロールして新しい tag をバージョンにします。

### 推奨: Packagist に GitHub 連携させる

1. Packagist から一度ログアウトし、**GitHub でログイン** し直す (権限付与)。
2. Packagist アプリケーションが `stein2nd` のリポジトリにアクセスできることを確認する。
3. パッケージ一覧に「自動同期されていない」警告が出ていなければ完了。

### 代替: 手動 webhook

GitHub リポジトリ → Settings → Webhooks → Add webhook:

| 項目 | 値 |
| --- | --- |
| Payload URL | `https://packagist.org/api/github?username=stein2nd` |
| Content Type | `application/json` |
| Secret | Packagist プロフィールの API Token |
| Events | **push のみ** |

`push` イベントは tag の作成を含みます。`Release` イベントは不要です (Release だけでは tag がないと Packagist はバージョンを作らない)。

### 手動更新 (保険)

Hook が遅延したときは、パッケージページの Update を押すか、API を呼びます。

```sh
curl -XPOST -H 'content-type:application/json' \
  'https://packagist.org/api/update-package?username=stein2nd&apiToken=API_TOKEN' \
  -d '{"repository":{"url":"https://github.com/stein2nd/global-composer-setup"}}'
```

## publish 手順 (tag + Release)

Packagist が読むのは **Git tag** です。GitHub Release はユーザー向けのノートであり、Packagist の必須条件ではありません。
運用としては、tag push と Release 作成を同じワークフローで行います。

```sh
# 0. ビルド
npm run build

# 1. CHANGELOG を更新し、実行可能な bin がツリーに含まれることを確認
#    (dist/ を tag 対象コミットに含める。gitignore したまま tag すると Packagist ユーザーに bin が届かない)

# 2. バージョン tag
git tag v1.0.0
git push origin v1.0.0

# 3. GitHub Release (gh)
gh release create v1.0.0 --title "v1.0.0" --notes-file CHANGELOG.md
```

tag 名は `v1.0.0` または `1.0.0` です。Semantic Versioning に従います。
`composer.json` に `"version"` は書きません。Packagist が tag から採ります。

### Vite 成果物と tag ツリー

npm の `files` + `npm publish` と違い、Packagist は tag の中身をそのまま配布します。

| 方針 | 内容 |
| --- | --- |
| 必須 | tag のコミットに、Composer `bin` が指す実行ファイルが存在する |
| 推奨 | CI が `npm ci && npm run build` を走らせ、成果が入っていない tag を失敗させる |
| 禁止 | 未ビルドの `dist/` を「あるもの」として Release する |

`dist/` を常時コミットするか、リリース専用コミットに乗せるかは実装時に決めます。
いずれにせよ **Packagist がクロールする tag = 実行可能な CLUI** です。

### 自己参照 `stein2nd/global-composer` の更新

`require` の自己参照は、**Packagist に載った最新バージョン** を `^x.y.z` で明示する運用とします ([layout.md](./layout.md))。

```sh
# publish 後: Packagist 上の latest を確認
composer show stein2nd/global-composer --available

# composer.json の require を更新
# "stein2nd/global-composer": "^x.y.z"
```

開発中に tag していない版を自己参照に書かないでください。
`dev-main` や `*` は使いません (`check`、`update`、`sync` のマージ判定との相性のため)。

## CI、自動 Release

| 項目 | 内容 |
| --- | --- |
| workflow | `.github/workflows/packagist-release.yml` (実装時) |
| トリガー | tag push (`v*`) または手動 dispatch |
| 処理 | Vite `build` → 成果物確認 → `gh release create` |
| Packagist | GitHub Hook が tag push を受けて自動クロール。CI から `npm publish` 相当のアップロードはしない |
| 保険 | Hook 失敗時は Packagist Update API を job 末尾で呼んでよい |

```sh
# tag push で GitHub Release + Packagist クロール
git tag v1.x.x
git push origin v1.x.x
```

手動 dry-run とは、GitHub Actions → **Release** → Run workflow → `dry_run: true` (Release も tag も切らない) という操作のことです。

## ユーザー向けインストール

```sh
composer global require stein2nd/global-composer
global-composer install
```

`$COMPOSER_HOME/vendor/bin` が PATH に入っている必要があります。
確認: `composer global config bin-dir --absolute`。

## 更新

```sh
composer global update stein2nd/global-composer
global-composer install
```

または:

```sh
global-composer check    # stein2nd/global-composer 自身の更新も表示される
global-composer update   # 実効 composer.json 更新 (Packagist 済み版が前提)
global-composer install
```

## GitHub リポジトリ

| 項目 | 値 |
| --- | --- |
| リポジトリ名 | `global-composer-setup` |
| 想定 URL | `https://github.com/stein2nd/global-composer-setup` |
| README | インストール手順 + OS 別セットアップ |
| シリーズ | Global Package Setup (姉妹: `global-npm-setup`) |
| Packagist | https://packagist.org/packages/stein2nd/global-composer (submit 後) |

## トレードオフを受け入れる理由

| トレードオフ | 受け入れ理由 |
| --- | --- |
| **Packagist / tag 依存:** 公式一覧の変更は tag (または開発時の `path` / VCS リポジトリ) が必要 | 一覧の正本を1箇所に固定し、自宅 macOS と勤務先 Windows 11が同一 tag を参照できる。姉妹の ncu → publish → update フローを、CCU → tag → `composer global update` に写せる。 |
| **カスタム一覧:** 勤務先だけ別 pkg 集合にするには fork か overlay が必要 | overlay manifest で対応する。`user-deps.json`、`global-composer add` で追加分を管理し、upstream は `composer global update stein2nd/global-composer` で同期する。 |
| **ビルド成果を tag に含める:** Vite 後はソースそのものではなく `dist/` が bin になる | CLUI の起動を単純にする。ソースは GitHub で公開し、GPL-3.0-or-later を維持する。Packagist に npm のような別 tarball 経路はない。 |
| **Node ランタイムが残る:** Packagist パッケージだが実行は Node.js | シリーズの CLUI 実装 (FOP + Vite) を共有するため。PHP / Composer は外部ツールとして呼ぶ。 |

## 関連ドキュメント

* [naming.md](./naming.md): パッケージ名と bin
* [layout.md](./layout.md): 同梱パス
* [license.md](./license.md): GPL とソース公開

## ステータス

**草案:** 2026-08-15。姉妹 [npm-publish.md](https://github.com/stein2nd/global-npm-setup/blob/main/docs/npm-publish.md) を Packagist 向けに写したもの。
