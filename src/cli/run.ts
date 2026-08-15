import { resolvePackageRoot } from '../adapters/package-root.ts';
import { resolveSetupContext } from '../adapters/paths.ts';
import { handleAdd } from '../application/handle-add.ts';
import { handleCheck } from '../application/handle-check.ts';
import { handleInstall } from '../application/handle-install.ts';
import { handleList } from '../application/handle-list.ts';
import { handleSync } from '../application/handle-sync.ts';
import { handleUpdate } from '../application/handle-update.ts';
import { parseAddSpec } from '../domain/parse-add-spec.ts';
import { printUsage } from './usage.ts';

export function runMain(argv: string[]): number {
  const [subcommand, ...rest] = argv;

  try {
    if (subcommand === 'list') {
      if (rest.length > 0) {
        printUsage();
        return 1;
      }
      return handleList();
    }

    switch (subcommand) {
      case 'check':
        if (rest.length > 0) {
          printUsage();
          return 1;
        }
        return handleCheck(resolveSetupContext(resolvePackageRoot()));
      case 'update':
        if (rest.length > 0) {
          printUsage();
          return 1;
        }
        return handleUpdate(resolveSetupContext(resolvePackageRoot()));
      case 'install':
        if (rest.length > 0) {
          printUsage();
          return 1;
        }
        return handleInstall(resolveSetupContext(resolvePackageRoot()));
      case 'sync':
        if (rest.some((arg) => arg !== '--dry-run')) {
          printUsage();
          return 1;
        }
        return handleSync(resolveSetupContext(resolvePackageRoot()), rest.includes('--dry-run'));
      case 'add': {
        const positional = rest.filter((arg) => arg !== '--dev');
        if (positional.length !== 1 || !parseAddSpec(positional[0]).valid) {
          printUsage();
          return 1;
        }
        return handleAdd(resolveSetupContext(resolvePackageRoot()), rest);
      }
      default:
        printUsage();
        return 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return 1;
  }
}
