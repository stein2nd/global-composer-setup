import os from 'node:os';
import path from 'node:path';

import { SETUP_DIR_ENV, SETUP_DIR_NAME } from '../domain/constants.ts';
import type { SetupContext } from '../domain/types.ts';

export function defaultSetupDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, SETUP_DIR_NAME);
  }

  return path.join(os.homedir(), '.config', SETUP_DIR_NAME);
}

export function resolveSetupContext(packageRoot: string): SetupContext {
  const setupDir = path.resolve(process.env[SETUP_DIR_ENV]?.trim() || defaultSetupDir());

  return {
    packageRoot,
    setupDir,
    upstreamComposerPath: path.join(packageRoot, 'composer.json'),
    materializedComposerPath: path.join(setupDir, 'composer.json'),
    userDepsPath: path.join(setupDir, 'user-deps.json'),
    metaPath: path.join(setupDir, '.upstream-meta.json'),
  };
}
