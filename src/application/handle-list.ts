import { resolveComposerHome, runComposer } from '../adapters/composer.ts';

export function handleList(): number {
  const home = resolveComposerHome();
  console.log(`COMPOSER_HOME=${home}`);
  return runComposer(['global', 'show']);
}
