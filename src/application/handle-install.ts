import { allowCcuPlugin, runComposer } from '../adapters/composer.ts';
import { readRequire } from '../adapters/json-io.ts';
import { toGlobalInstallSpec } from '../domain/install-spec.ts';
import { isPlatformPackage } from '../domain/platform-package.ts';
import type { SetupContext } from '../domain/types.ts';
import { prepare } from './prepare.ts';

export function handleInstall(ctx: SetupContext): number {
  prepare(ctx);

  const requireMap = readRequire(ctx.materializedComposerPath);
  const specs = Object.entries(requireMap)
    .filter(([name]) => !isPlatformPackage(name))
    .map(([name, constraint]) => toGlobalInstallSpec(name, constraint));

  if (specs.length === 0) {
    console.error('No packages to install.');
    return 1;
  }

  const allowStatus = allowCcuPlugin();
  if (allowStatus !== 0) {
    return allowStatus;
  }

  return runComposer(['global', 'require', '--', ...specs]);
}
