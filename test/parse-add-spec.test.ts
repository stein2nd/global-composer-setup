import assert from 'node:assert/strict';
import { test } from 'vitest';

import { parseAddSpec } from '../src/domain/parse-add-spec.ts';
import { parseLatestStable } from '../src/domain/parse-latest-stable.ts';
import { resolveDefaultConstraint } from '../src/application/resolve-default-constraint.ts';

test('RANGE-01: composer show success returns caret constraint', () => {
  const warnings: string[] = [];
  const constraint = resolveDefaultConstraint('friendsofphp/php-cs-fixer', {
    spawn: () => ({
      status: 0,
      stdout: JSON.stringify({ versions: ['v3.64.0', 'v3.63.0'] }),
      stderr: '',
      pid: 0,
      output: [],
      signal: null,
    }),
    log: (message) => warnings.push(message),
  });

  assert.equal(constraint, '^3.64.0');
  assert.equal(warnings.length, 0);
});

test('RANGE-02: composer show failure falls back to wildcard with warning', () => {
  const warnings: string[] = [];
  const constraint = resolveDefaultConstraint('missing/package', {
    spawn: () => ({
      status: 1,
      stdout: '',
      stderr: 'network error',
      pid: 0,
      output: [],
      signal: null,
    }),
    log: (message) => warnings.push(message),
  });

  assert.equal(constraint, '*');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Warning: could not resolve latest version/);
});

test('RANGE-03: name without vendor/package is invalid', () => {
  assert.equal(parseAddSpec('phpstan').valid, false);
  assert.equal(parseAddSpec('friendsofphp/php-cs-fixer').valid, true);
});

test('parseAddSpec handles vendor/package:constraint', () => {
  assert.deepEqual(parseAddSpec('friendsofphp/php-cs-fixer:^3.64'), {
    name: 'friendsofphp/php-cs-fixer',
    constraint: '^3.64',
    valid: true,
  });
});

test('parseAddSpec handles vendor/package without constraint', () => {
  assert.deepEqual(parseAddSpec('phpstan/phpstan'), {
    name: 'phpstan/phpstan',
    constraint: undefined,
    valid: true,
  });
});

test('parseLatestStable skips pre-release tags', () => {
  assert.equal(
    parseLatestStable(JSON.stringify({ versions: ['v3.64.0-RC1', 'v3.63.2'] })),
    '3.63.2',
  );
});
