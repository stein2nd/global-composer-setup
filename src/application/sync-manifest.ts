import {
  readConstraintMap,
  readJson,
  readMaterialized,
  readUserDeps,
  writeJson,
} from '../adapters/json-io.ts';
import { buildMaterializedComposer, toComposerJson } from '../domain/materialized.ts';
import { mergeRequire } from '../domain/merge-require.ts';
import { mergeRequireDev } from '../domain/merge-require-dev.ts';
import { officialRequireFromComposerJson } from '../domain/official-require.ts';
import { buildReport, hasReportChanges } from '../domain/report.ts';
import type { SetupContext, SyncReport, UpstreamMeta } from '../domain/types.ts';

export type SyncResult = {
  changed: boolean;
  report: SyncReport;
  nextPkg: ReturnType<typeof toComposerJson>;
};

function readUpstreamVersion(upstream: Record<string, unknown>): string {
  const extra = upstream.extra;
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    const block = (extra as Record<string, unknown>)['global-composer'];
    if (block && typeof block === 'object' && !Array.isArray(block)) {
      const version = (block as Record<string, unknown>)['upstream-version'];
      if (typeof version === 'string' && version) {
        return version;
      }
    }
  }

  if (typeof upstream.version === 'string' && upstream.version) {
    return upstream.version;
  }

  return '0.0.0-dev';
}

export function syncManifest(ctx: SetupContext, { dryRun = false } = {}): SyncResult {
  const upstream = readJson(ctx.upstreamComposerPath);
  if (!upstream) {
    throw new Error(`Failed to read upstream composer.json: ${ctx.upstreamComposerPath}`);
  }

  const userDeps = readUserDeps(ctx);
  const current = readMaterialized(ctx.materializedComposerPath);
  const metaRaw = readJson(ctx.metaPath);
  const metaUserDeps =
    metaRaw?.userDeps && typeof metaRaw.userDeps === 'object'
      ? (metaRaw.userDeps as Record<string, unknown>)
      : {};
  const meta: UpstreamMeta | null = metaRaw
    ? {
        upstreamVersion: typeof metaRaw.upstreamVersion === 'string' ? metaRaw.upstreamVersion : '',
        require: readConstraintMap(metaRaw.require),
        userDeps: {
          require: readConstraintMap(metaUserDeps.require),
          requireDev: readConstraintMap(metaUserDeps['require-dev']),
        },
      }
    : null;

  const extra =
    upstream.extra && typeof upstream.extra === 'object' && !Array.isArray(upstream.extra)
      ? (upstream.extra as Record<string, unknown>)
      : {};
  const extraBlock =
    extra['global-composer'] &&
    typeof extra['global-composer'] === 'object' &&
    !Array.isArray(extra['global-composer'])
      ? (extra['global-composer'] as Record<string, unknown>)
      : {};
  const upstreamRequire = officialRequireFromComposerJson({
    require: readConstraintMap(upstream.require),
    extra: {
      'global-composer': {
        require: readConstraintMap(extraBlock.require),
      },
    },
  });
  const merged = {
    require: mergeRequire({
      upstream: { require: upstreamRequire },
      current,
      meta,
      userDeps,
    }),
    requireDev: mergeRequireDev({
      current,
      meta,
      userDeps,
    }),
  };

  const nextManifest = buildMaterializedComposer(merged);
  const nextPkg = toComposerJson(nextManifest);
  const report = buildReport(current, merged);
  const changed = hasReportChanges(report);

  if (!dryRun) {
    writeJson(ctx.materializedComposerPath, nextPkg);
    writeJson(ctx.metaPath, {
      upstreamVersion: readUpstreamVersion(upstream),
      require: { ...upstreamRequire },
      userDeps: {
        require: { ...userDeps.require },
        'require-dev': { ...userDeps.requireDev },
      },
    });
  }

  return { changed, report, nextPkg };
}
