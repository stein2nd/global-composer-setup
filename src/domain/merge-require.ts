import { PHP_CONSTRAINT, PHP_PACKAGE } from './constants.ts';
import type { ConstraintMap, MergeRequireInput } from './types.ts';

export function mergeRequire({
  upstream,
  current,
  meta,
  userDeps,
}: MergeRequireInput): ConstraintMap {
  const merged: ConstraintMap = {};
  const upstreamRequire = upstream.require ?? {};
  const userOverrides = userDeps.require ?? {};
  const prevUpstream = meta?.require ?? {};
  const currentRequire = current?.require ?? {};

  for (const [name, upstreamConstraint] of Object.entries(upstreamRequire)) {
    if (name === PHP_PACKAGE) {
      merged[name] = PHP_CONSTRAINT;
      continue;
    }

    if (Object.hasOwn(userOverrides, name)) {
      merged[name] = userOverrides[name];
      continue;
    }

    const currentConstraint = currentRequire[name];
    const prevConstraint = prevUpstream[name];

    if (
      currentConstraint !== undefined &&
      prevConstraint !== undefined &&
      currentConstraint !== prevConstraint
    ) {
      merged[name] = currentConstraint;
    } else {
      merged[name] = upstreamConstraint;
    }
  }

  for (const [name, constraint] of Object.entries(userOverrides)) {
    if (!Object.hasOwn(upstreamRequire, name)) {
      merged[name] = constraint;
    }
  }

  for (const [name, constraint] of Object.entries(currentRequire)) {
    if (Object.hasOwn(merged, name) || name === PHP_PACKAGE) {
      continue;
    }

    const wasUpstream = Object.hasOwn(prevUpstream, name);
    const stillUpstream = Object.hasOwn(upstreamRequire, name);

    if (wasUpstream && !stillUpstream && !Object.hasOwn(userOverrides, name)) {
      continue;
    }

    merged[name] = constraint;
  }

  merged[PHP_PACKAGE] = PHP_CONSTRAINT;
  return merged;
}
