import assert from 'node:assert/strict';
import { test } from 'vitest';

import { buildMaterializedComposer } from '../src/domain/materialized.ts';
import { mergeRequireDev } from '../src/domain/merge-require-dev.ts';

test('SYNC-07: user-deps require-dev is merged into materialized', () => {
  const requireDev = mergeRequireDev({
    current: { requireDev: {} },
    meta: { userDeps: { requireDev: {} } },
    userDeps: { requireDev: { 'phpstan/phpstan': '^2.0' } },
  });

  const pkg = buildMaterializedComposer({
    require: {},
    requireDev,
  });

  assert.equal(pkg.requireDev['phpstan/phpstan'], '^2.0');
});

test('SYNC-08: upstream require-dev is not an input to merge', () => {
  const requireDev = mergeRequireDev({
    current: { requireDev: {} },
    meta: { userDeps: { requireDev: {} } },
    userDeps: { requireDev: {} },
  });

  assert.equal(requireDev.eslint, undefined);
  assert.equal(Object.keys(requireDev).length, 0);
});

test('SYNC-09: removed user-deps require-dev is dropped', () => {
  const requireDev = mergeRequireDev({
    current: { requireDev: { 'phpstan/phpstan': '^2.0' } },
    meta: {
      userDeps: { requireDev: { 'phpstan/phpstan': '^2.0' } },
    },
    userDeps: { requireDev: {} },
  });

  assert.equal(requireDev['phpstan/phpstan'], undefined);
});

test('SYNC-10: ccu-updated require-dev is preserved', () => {
  const requireDev = mergeRequireDev({
    current: { requireDev: { 'phpstan/phpstan': '^3.0' } },
    meta: {
      userDeps: { requireDev: { 'phpstan/phpstan': '^2.0' } },
    },
    userDeps: { requireDev: { 'phpstan/phpstan': '^2.0' } },
  });

  assert.equal(requireDev['phpstan/phpstan'], '^3.0');
});
