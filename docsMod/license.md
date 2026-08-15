# Global Composer Package Setup - ライセンス GPL-3

Global Package Setup シリーズ (本プロジェクト) のライセンス方針です。

## 背景

本リポジトリは初版から **GPL-3.0-or-later** です。
姉妹 [Global npm Setup](https://github.com/stein2nd/global-npm-setup) が v2で MIT から GPL-3.0-or-later にそろえた方針を、最初から継承します。

Vite / FOP での実装があっても、ライセンスは変更しません。

## 決定事項

| 項目 | 決定 |
| --- | --- |
| ライセンス | GPL-3.0-or-later |
| LICENSE ファイル | GNU GPL v3全文 |
| `composer.json` `"license"` | `"GPL-3.0-or-later"` |
| 開発用 `package.json` `"license"` | `"GPL-3.0-or-later"` (置く場合) |

### GPL-3.0-or-later を選ぶ理由

* 姉妹 `@s2j/global-npm` および `@s2j/docs-linter` (GPL-2.0-or-later) と、同一 maintainer のツール群として copyleft の方向性をそろえる。
* Global Package Setup シリーズでは、同じ copyleft 方針をデフォルトとする。
* `-or-later` により将来の GPL 改訂版への適用を許容できる。
* Packagist / SPDX として広く認識されている。

## 変更対象ファイル

| ファイル | 内容 |
| --- | --- |
| `LICENSE` | GPL v3全文 + Copyright 表記 (既存) |
| `composer.json` | `"license": "GPL-3.0-or-later"` |
| `README.md` | ライセンス節 |
| `CHANGELOG.md` | 初回リリースにライセンスを明記 |

## Copyright 表記

```
Copyright (C) 2026 Koutarou ISHIKAWA

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
...
```

## 依存パッケージとの関係

本プロジェクトは **グローバル Composer パッケージの一覧と CLUI** を提供します。

* `require` に列挙するパッケージ (CCU 等) を **ソース同梱して再配布するわけではない**。
* CLUI 自身のソースコードが GPL-3.0-or-later で公開される。
* Vite が `dist/` にビルド成果を出しても、対応するソースは Git リポジトリで公開する。
* 各 require のライセンスは個別に遵守する (`composer licenses`、各 package の LICENSE を参照)。
* 外部ツール [Composer Check Updates](https://github.com/webworkerJoshua/composer-check-updates) は MIT です。本 CLUI が CCU を同梱再配布するのではなく、Composer 経由で利用します。

tarball / Git tag に `src/` を含めるかは、実装時に GPL 対応と配布サイズを見て決めます。
`support.source` / GitHub `repository` によるソース公開は維持します。

## バージョニング

本プロジェクトに MIT 時代はないため、ライセンス変更のためのメジャー bump は不要です。
初回公開は v1.0.0、ライセンスは GPL-3.0-or-later です。

## 関連ドキュメント

* [naming.md](./naming.md): パッケージ名
* [packagist-publish.md](./packagist-publish.md): 公開物と tag

## ステータス

**草案:** 2026-08-15。姉妹 [license.md](https://github.com/stein2nd/global-npm-setup/blob/main/docs/license.md) を踏襲。
