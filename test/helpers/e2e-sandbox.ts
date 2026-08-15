import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeJson } from '../../src/adapters/json-io.ts';
import type { SpawnFn } from '../../src/adapters/spawn.ts';
import { CCU_PACKAGE, SELF_PACKAGE } from '../../src/domain/constants.ts';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const E2E_ROOT = path.join(REPO_ROOT, '.sandbox', 'e2e');
export const E2E_SETUP = path.join(E2E_ROOT, 'setup');
export const E2E_HOME = path.join(E2E_ROOT, 'composer-home');
export const DUMMY_PKG = 'global-composer-test/dummy-bin';
export const DUMMY_BIN = 'dummy-gcs';
export const FIXTURE_DUMMY = path.join(REPO_ROOT, 'test', 'fixtures', 'dummy-bin-pkg');
export const FIXTURE_SELF = path.join(REPO_ROOT, 'test', 'fixtures', 'self-stub');

export function composerOnPath(): boolean {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  return (
    spawnSync(checker, ['composer'], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    }).status === 0
  );
}

export function resetE2eDirs(): void {
  fs.rmSync(E2E_ROOT, { recursive: true, force: true });
  fs.mkdirSync(E2E_HOME, { recursive: true });
  writeJson(path.join(E2E_HOME, 'composer.json'), {
    config: {
      'allow-plugins': {
        [CCU_PACKAGE]: true,
      },
    },
    repositories: [
      {
        type: 'path',
        url: FIXTURE_SELF,
        options: { symlink: true },
      },
      {
        type: 'path',
        url: FIXTURE_DUMMY,
        options: { symlink: true },
      },
    ],
  });
}

export function withE2eEnv<T>(fn: () => T): T {
  const previous = {
    setup: process.env.GLOBAL_COMPOSER_SETUP_DIR,
    home: process.env.COMPOSER_HOME,
    interaction: process.env.COMPOSER_NO_INTERACTION,
  };

  process.env.GLOBAL_COMPOSER_SETUP_DIR = E2E_SETUP;
  process.env.COMPOSER_HOME = E2E_HOME;
  process.env.COMPOSER_NO_INTERACTION = '1';

  try {
    return fn();
  } finally {
    restoreEnv('GLOBAL_COMPOSER_SETUP_DIR', previous.setup);
    restoreEnv('COMPOSER_HOME', previous.home);
    restoreEnv('COMPOSER_NO_INTERACTION', previous.interaction);
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

export function dummyBinExists(): boolean {
  const binDir = path.join(E2E_HOME, 'vendor', 'bin');
  return [DUMMY_BIN, `${DUMMY_BIN}.bat`, `${DUMMY_BIN}.cmd`].some((name) =>
    fs.existsSync(path.join(binDir, name)),
  );
}

export function globalComposerJson(): Record<string, unknown> {
  const filePath = path.join(E2E_HOME, 'composer.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

export function installedRequire(): Record<string, string> {
  const requireMap = globalComposerJson().require;
  if (!requireMap || typeof requireMap !== 'object' || Array.isArray(requireMap)) {
    return {};
  }

  return requireMap as Record<string, string>;
}

export function expectedInstallNames(): string[] {
  return [SELF_PACKAGE, CCU_PACKAGE, DUMMY_PKG];
}

export function fakeSpawnResult(
  status: number,
  stdout = '',
  stderr = '',
): SpawnSyncReturns<string> {
  return {
    status,
    stdout,
    stderr,
    pid: 1,
    output: [null, stdout, stderr],
    signal: null,
  };
}

export function recordingSpawn(calls: Array<{ command: string; args: string[] }>): SpawnFn {
  return (command, args) => {
    calls.push({ command, args });
    return fakeSpawnResult(0, '{}');
  };
}
