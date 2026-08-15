import assert from 'node:assert/strict';
import { test } from 'vitest';

import { mergeRequire } from '../src/domain/merge-require.ts';
import { officialRequireFromComposerJson } from '../src/domain/official-require.ts';

test('SYNC-01: user-only require is preserved after upstream update', () => {
  const merged = mergeRequire({
    upstream: { require: { 'stein2nd/global-composer': '^1.1.0' } },
    current: {
      require: {
        'stein2nd/global-composer': '^1.0.0',
        'friendsofphp/php-cs-fixer': '^3.64',
      },
    },
    meta: {
      require: { 'stein2nd/global-composer': '^1.0.0' },
    },
    userDeps: {
      require: { 'friendsofphp/php-cs-fixer': '^3.64' },
    },
  });

  assert.equal(merged['stein2nd/global-composer'], '^1.1.0');
  assert.equal(merged['friendsofphp/php-cs-fixer'], '^3.64');
  assert.equal(merged.php, '>=8.3');
});

test('SYNC-02: stale upstream-managed package follows new upstream constraint', () => {
  const merged = mergeRequire({
    upstream: { require: { 'stein2nd/global-composer': '^1.1.0' } },
    current: { require: { 'stein2nd/global-composer': '^1.0.0' } },
    meta: { require: { 'stein2nd/global-composer': '^1.0.0' } },
    userDeps: { require: {} },
  });

  assert.equal(merged['stein2nd/global-composer'], '^1.1.0');
});

test('SYNC-03: update-already-applied constraint is preserved', () => {
  const merged = mergeRequire({
    upstream: { require: { 'webworkerjoshua/composer-check-updates': '^0.0.3' } },
    current: { require: { 'webworkerjoshua/composer-check-updates': '^0.1.0' } },
    meta: { require: { 'webworkerjoshua/composer-check-updates': '^0.0.3' } },
    userDeps: { require: {} },
  });

  assert.equal(merged['webworkerjoshua/composer-check-updates'], '^0.1.0');
});

test('SYNC-04: user-deps pin overrides upstream constraint', () => {
  const merged = mergeRequire({
    upstream: { require: { 'stein2nd/global-composer': '^1.1.0' } },
    current: { require: { 'stein2nd/global-composer': '^1.1.0' } },
    meta: { require: { 'stein2nd/global-composer': '^1.0.0' } },
    userDeps: { require: { 'stein2nd/global-composer': '^1.0.0' } },
  });

  assert.equal(merged['stein2nd/global-composer'], '^1.0.0');
});

test('SYNC-05: removed upstream-managed package is dropped', () => {
  const merged = mergeRequire({
    upstream: { require: {} },
    current: { require: { 'old/pkg': '^1.2.2' } },
    meta: { require: { 'old/pkg': '^1.2.2' } },
    userDeps: { require: {} },
  });

  assert.equal(merged['old/pkg'], undefined);
});

test('SYNC-06: user-added package survives upstream removal', () => {
  const merged = mergeRequire({
    upstream: { require: {} },
    current: { require: { 'phpstan/phpstan': '^2.0' } },
    meta: { require: {} },
    userDeps: { require: { 'phpstan/phpstan': '^2.0' } },
  });

  assert.equal(merged['phpstan/phpstan'], '^2.0');
});

test('official require merges extra self-reference', () => {
  const official = officialRequireFromComposerJson({
    require: {
      php: '>=8.3',
      'webworkerjoshua/composer-check-updates': '^0.0.3',
    },
    extra: {
      'global-composer': {
        require: { 'stein2nd/global-composer': '^1.0.0' },
      },
    },
  });

  assert.equal(official.php, '>=8.3');
  assert.equal(official['stein2nd/global-composer'], '^1.0.0');
  assert.equal(official['webworkerjoshua/composer-check-updates'], '^0.0.3');
});

test('SYNC-11: php is always >=8.3 and beats user-deps', () => {
  const merged = mergeRequire({
    upstream: { require: { php: '>=8.2' } },
    current: { require: { php: '>=8.1' } },
    meta: { require: { php: '>=8.1' } },
    userDeps: { require: { php: '>=8.4' } },
  });

  assert.equal(merged.php, '>=8.3');
});
