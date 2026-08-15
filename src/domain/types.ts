export type ConstraintMap = Record<string, string>;

export type UserDeps = {
  require: ConstraintMap;
  requireDev: ConstraintMap;
};

export type UpstreamManifest = {
  version?: string;
  require: ConstraintMap;
};

export type MaterializedComposer = {
  name: string;
  description: string;
  require: ConstraintMap;
  requireDev: ConstraintMap;
};

export type UpstreamMeta = {
  upstreamVersion: string;
  require: ConstraintMap;
  userDeps: {
    require: ConstraintMap;
    requireDev: ConstraintMap;
  };
};

export type MergeRequireInput = {
  upstream: { require?: ConstraintMap };
  current: { require?: ConstraintMap } | null;
  meta: { require?: ConstraintMap } | null;
  userDeps: { require?: ConstraintMap };
};

export type MergeRequireDevInput = {
  current: { requireDev?: ConstraintMap } | null;
  meta: { userDeps?: { requireDev?: ConstraintMap } } | null;
  userDeps: { requireDev?: ConstraintMap };
};

export type DiffItem = {
  name: string;
  range: string;
};

export type DiffUpdate = {
  name: string;
  from: string;
  to: string;
};

export type SectionDiff = {
  added: DiffItem[];
  updated: DiffUpdate[];
  removed: DiffItem[];
};

export type SyncReport = {
  require: SectionDiff;
  requireDev: SectionDiff;
};

export type AddSpec = {
  name: string;
  constraint: string | undefined;
  valid: boolean;
};

export type CcuPackageUpdate = {
  package: string;
  constraint: string;
  installed?: string;
  dev: boolean;
  inRange?: string | null;
  latest?: string | null;
  suggestedConstraint?: string;
};

export type SetupContext = {
  readonly packageRoot: string;
  readonly setupDir: string;
  readonly upstreamComposerPath: string;
  readonly materializedComposerPath: string;
  readonly userDepsPath: string;
  readonly metaPath: string;
};
