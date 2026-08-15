import assert from 'node:assert/strict';
import { test } from 'vitest';

import { toGlobalInstallSpec } from '../src/domain/install-spec.ts';
import { isPlatformPackage } from '../src/domain/platform-package.ts';
import { applyCcuUpdates } from '../src/domain/apply-ccu-updates.ts';

test('toGlobalInstallSpec joins name and constraint with a colon', () => {
  assert.equal(
    toGlobalInstallSpec('friendsofphp/php-cs-fixer', '^3.64'),
    'friendsofphp/php-cs-fixer:^3.64',
  );
});

test('toGlobalInstallSpec omits empty constraint', () => {
  assert.equal(toGlobalInstallSpec('phpstan/phpstan', '  '), 'phpstan/phpstan');
});

test('isPlatformPackage excludes php and ext-*', () => {
  assert.equal(isPlatformPackage('php'), true);
  assert.equal(isPlatformPackage('ext-mbstring'), true);
  assert.equal(isPlatformPackage('stein2nd/global-composer'), false);
});

test('applyCcuUpdates writes suggested constraints and keeps php', () => {
  const next = applyCcuUpdates(
    {
      name: 'global-composer/user-manifest',
      description: 'Effective Composer global manifest (generated)',
      require: {
        php: '>=8.3',
        'stein2nd/global-composer': '^1.0.0',
      },
      requireDev: {
        'phpstan/phpstan': '^2.0',
      },
    },
    [
      {
        package: 'stein2nd/global-composer',
        constraint: '^1.0.0',
        dev: false,
        suggestedConstraint: '^1.1.0',
      },
      {
        package: 'phpstan/phpstan',
        constraint: '^2.0',
        dev: true,
        suggestedConstraint: '^2.1',
      },
      {
        package: 'php',
        constraint: '>=8.3',
        dev: false,
        suggestedConstraint: '>=8.4',
      },
    ],
  );

  assert.equal(next.require.php, '>=8.3');
  assert.equal(next.require['stein2nd/global-composer'], '^1.1.0');
  assert.equal(next.requireDev['phpstan/phpstan'], '^2.1');
});
