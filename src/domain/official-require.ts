import type { ConstraintMap } from './types.ts';

export function officialRequireFromComposerJson(composerJson: {
  require?: ConstraintMap;
  extra?: {
    'global-composer'?: {
      require?: ConstraintMap;
    };
  };
}): ConstraintMap {
  const extraRequire = composerJson.extra?.['global-composer']?.require ?? {};
  return {
    ...(composerJson.require ?? {}),
    ...extraRequire,
  };
}
