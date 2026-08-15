import { captureComposer } from '../adapters/composer.ts';
import type { SpawnFn } from '../adapters/spawn.ts';
import { parseLatestStable } from '../domain/parse-latest-stable.ts';

export function resolveDefaultConstraint(
  packageName: string,
  {
    spawn,
    log = console.error,
  }: {
    spawn?: SpawnFn;
    log?: (message: string) => void;
  } = {},
): string {
  const result = captureComposer(['show', packageName, '--available', '--format=json'], {
    spawn,
  });

  if (result.status === 0) {
    const version = parseLatestStable(result.stdout);
    if (version) {
      return `^${version}`;
    }
  }

  log(`Warning: could not resolve latest version for ${packageName}; using "*".`);
  return '*';
}
