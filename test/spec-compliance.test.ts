import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, test } from 'vitest';

import { captureCcuJson, runCcuCheck } from '../src/adapters/ccu.ts';
import { runComposer } from '../src/adapters/composer.ts';
import { resolveSetupContext } from '../src/adapters/paths.ts';
import { exitStatus, useShell } from '../src/adapters/spawn.ts';
import { prepare } from '../src/application/prepare.ts';
import { runMain } from '../src/cli/run.ts';
import { USAGE } from '../src/cli/usage.ts';
import { CCU_PACKAGE, SELF_PACKAGE } from '../src/domain/constants.ts';
import { officialRequireFromComposerJson } from '../src/domain/official-require.ts';
import {
  composerOnPath,
  dummyBinExists,
  E2E_HOME,
  E2E_SETUP,
  expectedInstallNames,
  fakeSpawnResult,
  installedRequire,
  recordingSpawn,
  resetE2eDirs,
  withE2eEnv,
  DUMMY_PKG,
} from './helpers/e2e-sandbox.ts';
import {
  assertManualCatalog,
  flattenManualRows,
  loadManualCatalog,
} from './helpers/manual-tests.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'src');
const BIN_PATH = path.join(ROOT, 'bin', 'global-composer');
const COMPOSER_PATH = path.join(ROOT, 'composer.json');
const PKG_PATH = path.join(ROOT, 'package.json');
const SANDBOX_SETUP = path.join(ROOT, '.sandbox', 'setup');

type Status = 'PASS' | 'WARN' | 'FAIL' | 'PENDING';
const results: Array<{
  id: string;
  spec: string;
  condition: string;
  status: Status;
  detail?: string;
}> = [];

const UNIT_IDS: Array<{ id: string; spec: string; condition: string; file: string }> = [
  {
    id: 'SYNC-01',
    spec: 'overlay-manifest',
    condition: 'user-only require が upstream 更新後も維持されること。',
    file: 'test/merge-require.test.ts',
  },
  {
    id: 'SYNC-02',
    spec: 'overlay-manifest',
    condition: '未 update の upstream パッケージが新 constraint に追従すること。',
    file: 'test/merge-require.test.ts',
  },
  {
    id: 'SYNC-03',
    spec: 'overlay-manifest',
    condition: 'update 済み constraint が維持されること。',
    file: 'test/merge-require.test.ts',
  },
  {
    id: 'SYNC-04',
    spec: 'overlay-manifest',
    condition: 'user-deps ピンが upstream より優先されること。',
    file: 'test/merge-require.test.ts',
  },
  {
    id: 'SYNC-05',
    spec: 'overlay-manifest',
    condition: 'upstream 削除 (upstream 管理) が実効 composer.json から消えること。',
    file: 'test/merge-require.test.ts',
  },
  {
    id: 'SYNC-06',
    spec: 'overlay-manifest',
    condition: 'upstream 削除後も user 追加分が維持されること。',
    file: 'test/merge-require.test.ts',
  },
  {
    id: 'SYNC-07',
    spec: 'overlay-manifest',
    condition: 'user-deps require-dev が実効 composer.json にマージされること。',
    file: 'test/merge-require-dev.test.ts',
  },
  {
    id: 'SYNC-08',
    spec: 'overlay-manifest',
    condition: 'upstream require-dev が実効 composer.json に含まれないこと。',
    file: 'test/merge-require-dev.test.ts',
  },
  {
    id: 'SYNC-09',
    spec: 'overlay-manifest',
    condition: 'user-deps から消した require-dev が実効 composer.json からも消えること。',
    file: 'test/merge-require-dev.test.ts',
  },
  {
    id: 'SYNC-10',
    spec: 'overlay-manifest',
    condition: 'CCU update 済み require-dev が維持されること。',
    file: 'test/merge-require-dev.test.ts',
  },
  {
    id: 'SYNC-11',
    spec: 'overlay-manifest',
    condition: 'php が常に >=8.3 で user-deps より優先されること。',
    file: 'test/merge-require.test.ts',
  },
  {
    id: 'RANGE-01',
    spec: 'overlay-manifest',
    condition: 'composer show --available 成功時に ^x.y.z を返すこと。',
    file: 'test/parse-add-spec.test.ts',
  },
  {
    id: 'RANGE-02',
    spec: 'overlay-manifest',
    condition: '取得失敗時に * と warning を返すこと。',
    file: 'test/parse-add-spec.test.ts',
  },
  {
    id: 'RANGE-03',
    spec: 'overlay-manifest',
    condition: 'vendor/package 形式でない名前が無効になること。',
    file: 'test/parse-add-spec.test.ts',
  },
];

const PENDING_AUTOMATED: Array<{ id: string; spec: string; condition: string }> = [];

const E2E_TIMEOUT_MS = 180_000;

function mark(
  id: string,
  spec: string,
  condition: string,
  pass: boolean,
  detail = '',
  { warnOnFail = false } = {},
): void {
  let status: Status;
  if (pass) {
    status = 'PASS';
  } else if (warnOnFail) {
    status = 'WARN';
  } else {
    status = 'FAIL';
  }

  results.push({ id, spec, condition, status, detail: detail || undefined });
  assert.equal(status === 'FAIL', false, `${id}: ${condition}${detail ? ` (${detail})` : ''}`);
}

function pending(id: string, spec: string, condition: string): void {
  results.push({
    id,
    spec,
    condition,
    status: 'PENDING',
    detail: '自動テスト未実装',
  });
}

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function readSources(dir: string): string {
  return fs
    .readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.ts'))
    .map((name) => read(path.join(dir, name)))
    .join('\n');
}

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(read(filePath)) as Record<string, unknown>;
}

function listRepoFiles(dir: string): string[] {
  const skip = new Set(['node_modules', '.git', 'dist', '.sandbox', 'coverage']);
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listRepoFiles(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

test('naming: Packagist package name', () => {
  const composer = readJson(COMPOSER_PATH);
  mark(
    'NAM-01',
    'naming',
    'composer.json の name が `stein2nd/global-composer` であること。',
    composer.name === 'stein2nd/global-composer',
    `actual: ${String(composer.name)}`,
  );
});

test('naming: CLI command name', () => {
  const composer = readJson(COMPOSER_PATH);
  const bin = composer.bin;
  mark(
    'NAM-02',
    'naming',
    'composer.json の bin に `bin/global-composer` があること。',
    Array.isArray(bin) && bin.includes('bin/global-composer'),
  );
});

test('naming: development package.json is private', () => {
  const pkg = readJson(PKG_PATH);
  mark(
    'NAM-03',
    'naming',
    '開発用 package.json が private で name が `global-composer-setup` であること。',
    pkg.private === true && pkg.name === 'global-composer-setup',
  );
});

test('cli: entry and shebang', () => {
  mark('CLI-01', 'cli', '`bin/global-composer` が存在すること。', fs.existsSync(BIN_PATH));
  mark(
    'CLI-02',
    'cli',
    'bin 先頭行が `#!/usr/bin/env node` であること。',
    read(BIN_PATH).startsWith('#!/usr/bin/env node'),
  );
});

test('cli: json parse without jq', () => {
  const source = readSources(SRC_DIR);
  mark('CLI-05', 'cli', 'JSON 処理が `JSON.parse` であること。', source.includes('JSON.parse'));
  mark('CLI-06', 'cli', 'ソースに jq 呼び出しが含まれないこと。', !/\bjq\b/.test(source));
});

test('cli: setup directory resolution', () => {
  const source = read(path.join(SRC_DIR, 'adapters', 'paths.ts'));
  mark(
    'CLI-07',
    'cli',
    'package root は upstream 正本、`defaultSetupDir()` で overlay setup を解決すること。',
    source.includes('defaultSetupDir') &&
      source.includes('resolveSetupContext') &&
      source.includes('upstreamComposerPath'),
  );
  mark(
    'CLI-08',
    'cli',
    '`GLOBAL_COMPOSER_SETUP_DIR` で setup ディレクトリを上書きできること。',
    source.includes('GLOBAL_COMPOSER_SETUP_DIR') || source.includes('SETUP_DIR_ENV'),
  );
});

test('cli: usage on missing or unknown subcommand', () => {
  const missing = runMain([]);
  const unknown = runMain(['unknown-cmd']);
  mark(
    'CLI-11',
    'cli',
    'サブコマンド未指定時に usage を表示して exit 1 すること。',
    missing === 1 && USAGE.includes('Usage: global-composer'),
  );
  mark('CLI-12', 'cli', '未知サブコマンド時に usage を表示して exit 1 すること。', unknown === 1);
});

test('cli: add updates user-deps.json', () => {
  fs.rmSync(SANDBOX_SETUP, { recursive: true, force: true });
  const previous = process.env.GLOBAL_COMPOSER_SETUP_DIR;
  process.env.GLOBAL_COMPOSER_SETUP_DIR = SANDBOX_SETUP;
  const status = runMain(['add', 'friendsofphp/php-cs-fixer:^3.64']);
  process.env.GLOBAL_COMPOSER_SETUP_DIR = previous;

  const userDeps = readJson(path.join(SANDBOX_SETUP, 'user-deps.json'));
  const requireMap = userDeps.require as Record<string, string>;
  mark(
    'CLI-17',
    'cli',
    '`add` が `user-deps.json` の require に追記すること。',
    status === 0 && requireMap['friendsofphp/php-cs-fixer'] === '^3.64',
  );
});

test('cli: add --dev updates user-deps require-dev', () => {
  fs.rmSync(SANDBOX_SETUP, { recursive: true, force: true });
  const previous = process.env.GLOBAL_COMPOSER_SETUP_DIR;
  process.env.GLOBAL_COMPOSER_SETUP_DIR = SANDBOX_SETUP;
  const status = runMain(['add', 'phpstan/phpstan:^2.0', '--dev']);
  process.env.GLOBAL_COMPOSER_SETUP_DIR = previous;

  const userDeps = readJson(path.join(SANDBOX_SETUP, 'user-deps.json'));
  const requireDev = userDeps['require-dev'] as Record<string, string>;
  mark(
    'CLI-18',
    'cli',
    '`add --dev` が `user-deps.json` の require-dev に追記すること。',
    status === 0 && requireDev['phpstan/phpstan'] === '^2.0',
  );
});

test('cli: sync materializes overlay manifest', () => {
  fs.rmSync(SANDBOX_SETUP, { recursive: true, force: true });
  const previous = process.env.GLOBAL_COMPOSER_SETUP_DIR;
  process.env.GLOBAL_COMPOSER_SETUP_DIR = SANDBOX_SETUP;
  const status = runMain(['sync']);
  process.env.GLOBAL_COMPOSER_SETUP_DIR = previous;

  const materialized = readJson(path.join(SANDBOX_SETUP, 'composer.json'));
  const upstream = readJson(COMPOSER_PATH);
  const materializedRequire = materialized.require as Record<string, string>;
  const upstreamRequire = upstream.require as Record<string, string>;
  const extraSelf = ((
    upstream.extra as { 'global-composer'?: { require?: Record<string, string> } }
  )?.['global-composer']?.require ?? {})['stein2nd/global-composer'];
  mark(
    'CLI-19',
    'cli',
    '`sync` が upstream require と自己参照を実効 composer.json に反映すること。',
    status === 0 &&
      materialized.name === 'global-composer/user-manifest' &&
      materializedRequire.php === '>=8.3' &&
      materializedRequire['webworkerjoshua/composer-check-updates'] ===
        upstreamRequire['webworkerjoshua/composer-check-updates'] &&
      materializedRequire['stein2nd/global-composer'] === extraSelf,
  );
});

test('cli: list subcommand', () => {
  const listSource = read(path.join(SRC_DIR, 'application', 'handle-list.ts'));
  const runSource = read(path.join(SRC_DIR, 'cli', 'run.ts'));
  const usage = read(path.join(SRC_DIR, 'cli', 'usage.ts'));

  mark(
    'CLI-20',
    'cli-list',
    '`list` が `composer global show` を spawn すること。',
    listSource.includes("'global'") && listSource.includes("'show'"),
  );
  mark(
    'CLI-21',
    'cli-list',
    '`list` の実装が `syncManifest` / `prepare` を呼ばないこと。',
    !listSource.includes('syncManifest') &&
      !listSource.includes('prepare') &&
      !runSource.slice(runSource.indexOf("subcommand === 'list'")).includes('prepare('),
  );
  mark(
    'CLI-22',
    'cli-list',
    '`usage` 文字列に `list` が含まれること。',
    usage.includes('Usage: global-composer <check|update|install|sync|add|list>') &&
      usage.includes('list     List packages in the Composer global project'),
  );
  mark(
    'CLI-23',
    'cli-list',
    '`list` が `COMPOSER_HOME` を1行目に出すこと。',
    listSource.includes('COMPOSER_HOME='),
  );
});

test('install: C-type composer global require', () => {
  const source = readSources(SRC_DIR);
  mark(
    'INS-01',
    'install',
    'install が `composer global require` に列挙 spec を渡すこと。',
    source.includes("'global'") &&
      source.includes("'require'") &&
      source.includes('toGlobalInstallSpec'),
  );
  mark(
    'INS-04',
    'install',
    'packages が空のとき `No packages to install.` で exit 1 すること。',
    source.includes('No packages to install.'),
  );
  mark(
    'INS-05',
    'install',
    'install 単体で CCU を呼ばないこと。',
    !read(path.join(SRC_DIR, 'application', 'handle-install.ts')).includes('runCcu'),
  );
});

test('layout: setup dir is not COMPOSER_HOME', () => {
  const source = readSources(SRC_DIR);
  mark(
    'LAY-10',
    'layout',
    'setup ディレクトリ名が `global-composer` であること。',
    source.includes("'global-composer'"),
  );
  mark(
    'LAY-11',
    'layout',
    '実効マニフェストが `$SETUP_DIR/composer.json` であること。',
    source.includes("path.join(setupDir, 'composer.json')"),
  );
  mark(
    'LAY-12',
    'layout',
    'user-deps と meta が setup 配下であること。',
    source.includes("path.join(setupDir, 'user-deps.json')") &&
      source.includes("path.join(setupDir, '.upstream-meta.json')"),
  );
});

test('license: GPL-3.0-or-later', () => {
  const composer = readJson(COMPOSER_PATH);
  const pkg = readJson(PKG_PATH);
  mark(
    'LIC-01',
    'license',
    'composer.json と package.json の license が GPL-3.0-or-later であること。',
    composer.license === 'GPL-3.0-or-later' && pkg.license === 'GPL-3.0-or-later',
  );
  mark(
    'LIC-02',
    'license',
    'LICENSE ファイルが存在すること。',
    fs.existsSync(path.join(ROOT, 'LICENSE')),
  );
});

test('cli: check uses CCU dry-run in the setup directory', () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const previous = process.env.GLOBAL_COMPOSER_SETUP_DIR;
  process.env.GLOBAL_COMPOSER_SETUP_DIR = SANDBOX_SETUP;
  const ctx = resolveSetupContext(ROOT);
  runCcuCheck(ctx.setupDir, { spawn: recordingSpawn(calls) });
  process.env.GLOBAL_COMPOSER_SETUP_DIR = previous;

  const args = calls[0]?.args ?? [];
  mark(
    'CLI-09',
    'cli',
    'check が `composer check-updates --dry-run` を `--working-dir=$SETUP_DIR` で呼ぶこと。',
    calls[0]?.command === 'composer' &&
      args.includes('--working-dir') &&
      args.includes(ctx.setupDir) &&
      args.includes('check-updates') &&
      args.includes('--dry-run'),
  );
});

test('cli: update captures CCU json and does not run composer global update', () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  captureCcuJson(SANDBOX_SETUP, { spawn: recordingSpawn(calls) });
  const args = calls[0]?.args ?? [];
  const updateSource = read(path.join(SRC_DIR, 'application', 'handle-update.ts'));
  mark(
    'CLI-10',
    'cli',
    'update が CCU `--format json` で constraint を書き、`composer global update` を呼ばないこと。',
    calls[0]?.command === 'composer' &&
      args.includes('--format') &&
      args.includes('json') &&
      args.includes('check-updates') &&
      !updateSource.includes("'global', 'update'") &&
      !updateSource.includes('global update'),
  );
});

test('cli: check does not rewrite the repository composer.json', () => {
  const before = read(COMPOSER_PATH);
  const previous = process.env.GLOBAL_COMPOSER_SETUP_DIR;
  process.env.GLOBAL_COMPOSER_SETUP_DIR = SANDBOX_SETUP;
  const ctx = resolveSetupContext(ROOT);
  prepare(ctx);
  runCcuCheck(ctx.setupDir, { spawn: recordingSpawn([]) });
  process.env.GLOBAL_COMPOSER_SETUP_DIR = previous;
  mark(
    'CLI-16',
    'cli',
    'check 実行後もリポジトリ root の composer.json が変わらないこと。',
    read(COMPOSER_PATH) === before,
  );
});

test('install: C-type enumeration and Windows spawn', () => {
  const installSource = read(path.join(SRC_DIR, 'application', 'handle-install.ts'));
  const spawnSource = read(path.join(SRC_DIR, 'adapters', 'spawn.ts'));
  mark(
    'INS-02',
    'install',
    'install が `$SETUP_DIR` を COMPOSER_HOME にする B 型を採らないこと。',
    !installSource.includes('COMPOSER_HOME') &&
      !installSource.includes('process.env') &&
      installSource.includes("['global', 'require'") &&
      !installSource.includes('cwd:'),
  );
  mark(
    'INS-03',
    'install',
    'install が require を `Object.entries` で列挙すること。',
    installSource.includes('Object.entries(requireMap)'),
  );
  mark(
    'INS-06',
    'install',
    'spawn 時に Windows 向け `shell: process.platform === "win32"` を使うこと。',
    spawnSource.includes("process.platform === 'win32'") &&
      spawnSource.includes('shell: useShell()'),
  );
  mark(
    'INS-07',
    'install',
    '子プロセス (Composer) の exit code をそのまま返すこと。',
    exitStatus(fakeSpawnResult(7)) === 7 &&
      runComposer(['global', 'require', 'example/pkg'], {
        spawn: () => fakeSpawnResult(9),
      }) === 9,
  );
});

test('layout: install skips require-dev and official require includes self', () => {
  const installSource = read(path.join(SRC_DIR, 'application', 'handle-install.ts'));
  const composer = readJson(COMPOSER_PATH);
  const official = officialRequireFromComposerJson({
    require: (composer.require ?? {}) as Record<string, string>,
    extra: composer.extra as {
      'global-composer'?: { require?: Record<string, string> };
    },
  });
  mark(
    'LAY-08',
    'layout',
    'install が require-dev を列挙しないこと。',
    installSource.includes('readRequire') &&
      !installSource.includes('require-dev') &&
      !installSource.includes('requireDev'),
  );
  mark(
    'LAY-09',
    'layout',
    '公式一覧に自己参照 `stein2nd/global-composer` が含まれること。',
    official[SELF_PACKAGE] === '^1.0.0' && official[CCU_PACKAGE] === '^0.0.3',
  );
});

test('legacy-scripts: no zsh install entrypoints', () => {
  const repoFiles = listRepoFiles(ROOT);
  const relative = repoFiles.map((filePath) => path.relative(ROOT, filePath));
  mark(
    'LEG-01',
    'legacy-scripts',
    '`install-global.zsh` がリポジトリに存在しないこと。',
    !relative.includes('install-global.zsh') &&
      relative.every((filePath) => path.basename(filePath) !== 'install-global.zsh'),
  );
  mark(
    'LEG-02',
    'legacy-scripts',
    '`~/bin/global-composer` 用の Zsh ラッパーを同梱しないこと。',
    relative.every((filePath) => !filePath.endsWith('.zsh')) &&
      !readSources(SRC_DIR).includes('~/bin/global-composer'),
  );
});

test('windows: path join and spawn shell, no zsh in CLUI', () => {
  const pathsSource = read(path.join(SRC_DIR, 'adapters', 'paths.ts'));
  const spawnSource = read(path.join(SRC_DIR, 'adapters', 'spawn.ts'));
  const sources = readSources(SRC_DIR);
  mark(
    'WIN-01',
    'windows',
    'パス解決が `path.join` / `path.resolve` であること。',
    pathsSource.includes('path.join') && pathsSource.includes('path.resolve'),
  );
  mark(
    'WIN-02',
    'windows',
    'spawn 時に Windows 判定付き shell オプションを使うこと。',
    useShell() === (process.platform === 'win32') &&
      spawnSource.includes("process.platform === 'win32'") &&
      spawnSource.includes('shell: useShell()'),
  );
  mark(
    'WIN-03',
    'windows',
    'CLUI ソースに Zsh 依存が含まれないこと。',
    !/\bzsh\b/i.test(sources) && !sources.includes('.zsh'),
  );
});

let e2eReady = false;
let e2eOk = false;

function bootstrapE2e(): boolean {
  if (e2eReady) {
    return e2eOk;
  }

  e2eReady = true;
  if (!composerOnPath()) {
    return false;
  }

  resetE2eDirs();
  e2eOk = withE2eEnv(() => {
    const addStatus = runMain(['add', `${DUMMY_PKG}:^1.0.0`]);
    const syncStatus = runMain(['sync']);
    const installStatus = runMain(['install']);
    return addStatus === 0 && syncStatus === 0 && installStatus === 0;
  });
  return e2eOk;
}

function markE2e(id: string, spec: string, condition: string, pass: boolean, detail = ''): void {
  if (!composerOnPath()) {
    mark(id, spec, condition, false, 'composer が PATH にないため WARN', { warnOnFail: true });
    return;
  }

  mark(id, spec, condition, pass, detail);
}

test('e2e: sync then install in a sandboxed COMPOSER_HOME', { timeout: E2E_TIMEOUT_MS }, () => {
  const ready = bootstrapE2e();
  const requireMap = ready ? installedRequire() : {};
  const setupVendor = path.join(E2E_SETUP, 'vendor');
  markE2e(
    'E2E-01',
    'overlay-manifest',
    'サンドボックス `SETUP_DIR` と `COMPOSER_HOME` で `sync` → `install` すること。',
    ready &&
      E2E_SETUP !== E2E_HOME &&
      !fs.existsSync(setupVendor) &&
      expectedInstallNames().every((name) => Object.hasOwn(requireMap, name)),
    ready ? '' : 'sandbox install が失敗した',
  );
});

test('e2e: check runs CCU dry-run in the sandbox', { timeout: E2E_TIMEOUT_MS }, () => {
  const ready = bootstrapE2e();
  const before = read(COMPOSER_PATH);
  const status = ready ? withE2eEnv(() => runMain(['check'])) : 1;
  markE2e(
    'E2E-02',
    'cli',
    'サンドボックスで `check` (CCU `--dry-run`) が動くこと。',
    ready && status === 0 && read(COMPOSER_PATH) === before,
    ready ? `exit ${status}` : 'sandbox install が失敗した',
  );
});

test(
  'e2e: update rewrites only the materialized composer.json',
  { timeout: E2E_TIMEOUT_MS },
  () => {
    const ready = bootstrapE2e();
    const beforeRoot = read(COMPOSER_PATH);
    const beforeUser = ready ? read(path.join(E2E_SETUP, 'user-deps.json')) : '';
    const beforeHome = ready ? read(path.join(E2E_HOME, 'composer.json')) : '';
    const status = ready ? withE2eEnv(() => runMain(['update'])) : 1;
    markE2e(
      'E2E-03',
      'cli',
      'サンドボックスで `update` が実効 composer.json だけを書き換えること。',
      ready &&
        status === 0 &&
        read(COMPOSER_PATH) === beforeRoot &&
        read(path.join(E2E_SETUP, 'user-deps.json')) === beforeUser &&
        read(path.join(E2E_HOME, 'composer.json')) === beforeHome &&
        fs.existsSync(path.join(E2E_SETUP, 'composer.json')),
      ready ? `exit ${status}` : 'sandbox install が失敗した',
    );
  },
);

test(
  'e2e: list prints COMPOSER_HOME and runs composer global show',
  { timeout: E2E_TIMEOUT_MS },
  () => {
    const ready = bootstrapE2e();
    const lines: string[] = [];
    const originalLog = console.log;
    const status = ready
      ? withE2eEnv(() => {
          console.log = (...args: unknown[]) => {
            lines.push(args.map(String).join(' '));
          };
          try {
            return runMain(['list']);
          } finally {
            console.log = originalLog;
          }
        })
      : 1;
    markE2e(
      'E2E-04',
      'cli-list',
      '`list` が `COMPOSER_HOME=` 行と `composer global show` を実実行すること。',
      ready && status === 0 && lines[0] === `COMPOSER_HOME=${E2E_HOME}`,
      ready ? `exit ${status}; line=${lines[0] ?? ''}` : 'sandbox install が失敗した',
    );
  },
);

test('e2e: install places bins in the sandboxed COMPOSER_HOME', { timeout: E2E_TIMEOUT_MS }, () => {
  const ready = bootstrapE2e();
  markE2e(
    'E2E-05',
    'install',
    'install 後に bin がサンドボックス `COMPOSER_HOME/vendor/bin` に載ること。',
    ready && dummyBinExists(),
    ready ? '' : 'sandbox install が失敗した',
  );
});

test('e2e: check then update then install', { timeout: E2E_TIMEOUT_MS }, () => {
  const ready = bootstrapE2e();
  const status = ready
    ? withE2eEnv(() => {
        const checkStatus = runMain(['check']);
        const updateStatus = runMain(['update']);
        const installStatus = runMain(['install']);
        return checkStatus === 0 && updateStatus === 0 && installStatus === 0;
      })
    : false;
  markE2e(
    'E2E-06',
    'usage',
    '定番フロー `check` → `update` → `install` をサンドボックスで通すこと。',
    Boolean(status),
    ready ? '' : 'sandbox install が失敗した',
  );
});

test('unit: SYNC and RANGE IDs are covered by dedicated files', () => {
  for (const row of UNIT_IDS) {
    const source = read(path.join(ROOT, row.file));
    mark(row.id, row.spec, row.condition, source.includes(`${row.id}:`));
  }
});

test('pending: remaining automated tests are catalogued', () => {
  const implemented = new Set(results.map((row) => row.id));
  for (const row of PENDING_AUTOMATED) {
    assert.equal(
      implemented.has(row.id),
      false,
      `${row.id} is listed as PENDING but already implemented`,
    );
    pending(row.id, row.spec, row.condition);
  }
});

test('manual: real-machine catalog is well-formed', () => {
  const catalog = loadManualCatalog(ROOT);
  assertManualCatalog(catalog);
  const ids = new Set(results.map((row) => row.id));
  for (const item of catalog.items) {
    assert.equal(ids.has(item.id), false, `${item.id} collides with an automated test id`);
  }
});

afterAll(() => {
  const done = results.filter((row) => row.status !== 'PENDING');
  const leftover = results.filter((row) => row.status === 'PENDING');
  const pass = results.filter((row) => row.status === 'PASS').length;
  const warn = results.filter((row) => row.status === 'WARN').length;
  const fail = results.filter((row) => row.status === 'FAIL').length;
  const pendingCount = leftover.length;
  const total = results.length;
  const implemented = pass + warn + fail;

  const manualRows = flattenManualRows(loadManualCatalog(ROOT));
  const manualDone = manualRows.filter((row) => row.status !== 'PENDING');
  const manualLeftover = manualRows.filter((row) => row.status === 'PENDING');
  const manualPass = manualRows.filter((row) => row.status === 'PASS').length;
  const manualWarn = manualRows.filter((row) => row.status === 'WARN').length;
  const manualFail = manualRows.filter((row) => row.status === 'FAIL').length;
  const manualPending = manualLeftover.length;
  const manualTotal = manualRows.length;
  const manualImplemented = manualPass + manualWarn + manualFail;

  const rowLine = (row: (typeof results)[number]) =>
    `| ${row.id} | ${row.spec} | ${row.status} | ${row.condition} |`;

  const record = (row: (typeof manualRows)[number]) =>
    [row.date, row.note].filter(Boolean).join(' / ') || '—';

  const manualLine = (row: (typeof manualRows)[number]) =>
    `| ${row.id} | ${row.osLabel} | ${row.spec} | ${row.status} | ${row.condition} | ${row.method} | ${record(row)} |`;

  const manualTable = (rows: typeof manualRows) =>
    [
      '| ID | OS | 仕様 | 結果 | 条件 | 確認方法 | 記録 |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      ...rows.map(manualLine),
    ].join('\n');

  const rate = (doneCount: number, all: number) =>
    all === 0 ? '0' : String(Math.round((doneCount / all) * 100));

  const lines = [
    '# Global Composer Package Setup - 仕様準拠テスト結果',
    '',
    `最終実行: **${new Date().toISOString().slice(0, 10)}**`,
    '',
    '実行: `npm test`',
    '',
    '実機の合否は [`test/manual-tests.json`](../test/manual-tests.json) を更新し、再実行でこのファイルへ反映する。',
    '',
    '## サマリー',
    '',
    '### 自動テスト',
    '',
    '| 区分 | 件数 |',
    '| --- | --- |',
    `| PASS | ${pass} |`,
    `| WARN | ${warn} |`,
    `| PENDING | ${pendingCount} |`,
    `| FAIL | ${fail} |`,
    `| 合計 | ${total} |`,
    '',
    `自動テスト実施率 (PASS + WARN + FAIL / 合計): **${rate(implemented, total)}%**`,
    '',
    '### 実機テスト',
    '',
    '| 区分 | 件数 |',
    '| --- | --- |',
    `| PASS | ${manualPass} |`,
    `| WARN | ${manualWarn} |`,
    `| PENDING | ${manualPending} |`,
    `| FAIL | ${manualFail} |`,
    `| 合計 | ${manualTotal} |`,
    '',
    `実機テスト実施率 (PASS + WARN + FAIL / 合計): **${rate(manualImplemented, manualTotal)}%**`,
    '',
    '件数は OS 別 (macOS / Windows 11) です。',
    '',
    '## 結果マーク',
    '',
    '* PASS: 条件を満たす',
    '* WARN: 条件未達だが、環境依存などで意図的に許容',
    '* PENDING (自動): 自動テスト未実装',
    '* PENDING (実機): その OS で未実施',
    '* FAIL: 条件未達 (要修正)',
    '',
    '## 自動テスト実施済み',
    '',
    '| ID | 仕様 | 結果 | 条件 |',
    '| --- | --- | --- | --- |',
    ...done.map(rowLine),
    '',
    '## 自動テスト残項目',
    '',
    leftover.length === 0
      ? '残項目はありません。'
      : ['| ID | 仕様 | 結果 | 条件 |', '| --- | --- | --- | --- |', ...leftover.map(rowLine)].join(
          '\n',
        ),
    '',
    '## 実機テスト実施済み',
    '',
    manualDone.length === 0 ? '実施済みはありません。' : manualTable(manualDone),
    '',
    '## 実機テスト残項目',
    '',
    manualLeftover.length === 0 ? '残項目はありません。' : manualTable(manualLeftover),
    '',
  ];
  fs.writeFileSync(path.join(ROOT, 'docsMod', 'test-results.md'), `${lines.join('\n')}\n`);
});

test('optional: composer is available', () => {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(checker, ['composer'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  mark(
    'ENV-01',
    'runtime',
    'PATH 上に composer があること (実機確認)。',
    result.status === 0,
    result.status === 0 ? '' : 'composer が PATH にないため WARN',
    { warnOnFail: true },
  );
});
