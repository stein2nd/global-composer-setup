# Changelog

## Unreleased

## v1.0.1: 2026-08-16

### Added

* Packagist に `stein2nd/global-composer` を初回 submit。GitHub Hook で tag push が自動クロールされる。
* `.cursor/` (`allowlist.json`) をリポジトリ管理対象にする。

## v1.0.0: 2026-08-15

### Added

* `global-composer` CLUI (TypeScript + Vite)。姉妹 Global npm Setup v2.2相当の6サブコマンド (`check` / `update` / `install` / `sync` / `add` / `list`)。
* overlay manifest (`user-deps.json` + 実効 `composer.json`) と C 型 install (`composer global require` 列挙)。
* ライセンス GPL-3.0-or-later。

* 仕様準拠テストの残項目を自動テスト化し、`docsMod/test-results.md` に PASS / PENDING を出す。サンドボックス E2E (check / update / install / list) と CI の PHP 8.3 / Composer。
* 実機テスト台帳 (`test/manual-tests.json`)。macOS / Windows 11別の確認方法を報告書へ転記。macOS は HW-01〜09実施済み。

### Changed

* 実効 `composer.json` の `name` を `global-composer/user-manifest` に変更。Composer の `vendor/package` 形式に合わせ、CCU が読めるようにする。

### Fixed

* Vite CJS 成果物で `import.meta.url` が空になり CLI が落ちる問題。bin の実パスから package root を解決する。
* サブコマンドなし / 未知サブコマンドでは package root 解決前に usage を出す。
