# Global Composer Package Setup - Modification

進行中の改修 initiative のタスク管理資料です。完了時は [docs/archive/](../docs/archive/README.md) に退避します。
確定した仕様は [docs/specs.md](../docs/specs.md) へ移行します。

## 2026-08-15: docsMod 仕様にもとづく CLUI 初版

* [x] `src/{cli,application,domain,adapters}` の FOP 分割
* [x] Vite で `dist/global-composer.js` をビルド
* [x] `composer.json` を upstream 正本 + Packagist 定義にする
* [x] SYNC-01〜11 / RANGE-01〜03 / CLI-20〜23のテスト
* [ ] Packagist submit と Git tag `v1.0.0`
* [ ] 仕様確定後に `docsMod/` を `docs/` へ移す
