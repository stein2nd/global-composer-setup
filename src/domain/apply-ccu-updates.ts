import { PHP_CONSTRAINT, PHP_PACKAGE } from './constants.ts';
import type { CcuPackageUpdate, ConstraintMap, MaterializedComposer } from './types.ts';

export function applyCcuUpdates(
  current: MaterializedComposer,
  updates: CcuPackageUpdate[],
): MaterializedComposer {
  const requireMap: ConstraintMap = { ...current.require };
  const requireDev: ConstraintMap = { ...current.requireDev };

  for (const update of updates) {
    const suggested = update.suggestedConstraint;
    if (!suggested) {
      continue;
    }

    if (update.dev) {
      if (Object.hasOwn(requireDev, update.package)) {
        requireDev[update.package] = suggested;
      }
      continue;
    }

    if (update.package === PHP_PACKAGE) {
      continue;
    }

    if (Object.hasOwn(requireMap, update.package)) {
      requireMap[update.package] = suggested;
    }
  }

  requireMap[PHP_PACKAGE] = PHP_CONSTRAINT;

  return {
    ...current,
    require: requireMap,
    requireDev,
  };
}
