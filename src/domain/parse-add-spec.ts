import type { AddSpec } from './types.ts';

const COMPOSER_NAME = /^[a-z0-9]([_.-]?[a-z0-9]+)*\/[a-z0-9]([_.-]?[a-z0-9]+)*$/i;

export function isComposerPackageName(name: string): boolean {
  return COMPOSER_NAME.test(name);
}

export function parseAddSpec(arg: string | undefined): AddSpec {
  if (!arg || typeof arg !== 'string') {
    return { name: '', constraint: undefined, valid: false };
  }

  const colon = arg.indexOf(':');
  const name = colon === -1 ? arg : arg.slice(0, colon);
  const rawConstraint = colon === -1 ? undefined : arg.slice(colon + 1);
  const constraint = rawConstraint === '' ? undefined : rawConstraint;

  return {
    name,
    constraint,
    valid: isComposerPackageName(name),
  };
}
