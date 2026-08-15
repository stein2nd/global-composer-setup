import { ensureSetupDir, readUserDeps, writeUserDeps } from '../adapters/json-io.ts';
import { parseAddSpec } from '../domain/parse-add-spec.ts';
import type { SetupContext } from '../domain/types.ts';
import { resolveDefaultConstraint } from './resolve-default-constraint.ts';
import { syncManifest } from './sync-manifest.ts';

export function handleAdd(ctx: SetupContext, args: string[]): number {
  const isDev = args.includes('--dev');
  const positional = args.filter((arg) => arg !== '--dev');

  if (positional.length !== 1) {
    console.error('Usage: global-composer add <vendor/pkg>[:constraint] [--dev]');
    return 1;
  }

  const spec = parseAddSpec(positional[0]);
  if (!spec.valid) {
    console.error('Package name must be in vendor/package form.');
    return 1;
  }

  const constraint =
    spec.constraint !== undefined ? spec.constraint : resolveDefaultConstraint(spec.name);

  ensureSetupDir(ctx);
  const userDeps = readUserDeps(ctx);
  if (isDev) {
    userDeps.requireDev[spec.name] = constraint;
  } else {
    userDeps.require[spec.name] = constraint;
  }
  writeUserDeps(ctx, userDeps);

  syncManifest(ctx);
  const section = isDev ? 'require-dev' : 'require';
  console.error(`Added ${spec.name}:${constraint} to user-deps.json (${section}).`);
  return 0;
}
