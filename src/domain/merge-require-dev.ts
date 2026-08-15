import type { ConstraintMap, MergeRequireDevInput } from './types.ts';

export function mergeRequireDev({ current, meta, userDeps }: MergeRequireDevInput): ConstraintMap {
  const merged: ConstraintMap = {};
  const userDev = userDeps.requireDev ?? {};
  const prevUserDev = meta?.userDeps?.requireDev ?? {};
  const currentDev = current?.requireDev ?? {};

  for (const [name, userConstraint] of Object.entries(userDev)) {
    const currentConstraint = currentDev[name];
    const prevConstraint = prevUserDev[name];

    if (
      currentConstraint !== undefined &&
      prevConstraint !== undefined &&
      currentConstraint !== prevConstraint
    ) {
      merged[name] = currentConstraint;
    } else {
      merged[name] = userConstraint;
    }
  }

  for (const [name, constraint] of Object.entries(currentDev)) {
    if (Object.hasOwn(merged, name) || Object.hasOwn(userDev, name)) {
      continue;
    }

    if (Object.hasOwn(prevUserDev, name)) {
      continue;
    }

    merged[name] = constraint;
  }

  return merged;
}
