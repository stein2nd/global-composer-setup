import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SELF_PACKAGE } from '../domain/constants.ts';

export function findPackageRoot(startDir: string): string {
  let dir = path.resolve(startDir);

  while (true) {
    const composerPath = path.join(dir, 'composer.json');
    if (fs.existsSync(composerPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(composerPath, 'utf8')) as {
          name?: string;
        };
        if (parsed.name === SELF_PACKAGE) {
          return dir;
        }
      } catch {
        // keep walking
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  throw new Error(`Could not locate ${SELF_PACKAGE} package root from ${startDir}`);
}

function fileUrlDir(url: string): string {
  return path.dirname(fileURLToPath(url));
}

function defaultStartDir(): string {
  const metaUrl = import.meta.url;
  if (typeof metaUrl === 'string' && metaUrl.startsWith('file:')) {
    return fileUrlDir(metaUrl);
  }

  const script = process.argv[1];
  if (script) {
    try {
      return path.dirname(fs.realpathSync(script));
    } catch {
      return path.dirname(path.resolve(script));
    }
  }

  return process.cwd();
}

export function resolvePackageRoot(fromUrl?: string): string {
  if (fromUrl && fromUrl.startsWith('file:')) {
    return findPackageRoot(fileUrlDir(fromUrl));
  }

  return findPackageRoot(defaultStartDir());
}
