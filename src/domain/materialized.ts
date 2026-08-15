import { MATERIALIZED_DESCRIPTION, MATERIALIZED_NAME } from './constants.ts';
import type { ConstraintMap, MaterializedComposer } from './types.ts';

export function buildMaterializedComposer(merged: {
  require: ConstraintMap;
  requireDev: ConstraintMap;
}): MaterializedComposer {
  return {
    name: MATERIALIZED_NAME,
    description: MATERIALIZED_DESCRIPTION,
    require: merged.require,
    requireDev: merged.requireDev,
  };
}

export function toComposerJson(manifest: MaterializedComposer): Record<string, unknown> {
  return {
    name: manifest.name,
    description: manifest.description,
    require: manifest.require,
    'require-dev': manifest.requireDev,
  };
}
