import { ensureSetupDir } from '../adapters/json-io.ts';
import { formatReport } from '../domain/report.ts';
import type { SetupContext } from '../domain/types.ts';
import { syncManifest } from './sync-manifest.ts';

export function handleSync(ctx: SetupContext, dryRun: boolean): number {
  ensureSetupDir(ctx);
  const { changed, report } = syncManifest(ctx, { dryRun });

  if (dryRun) {
    const lines = formatReport(report);
    if (lines.length === 0) {
      console.error('No changes.');
    } else {
      for (const line of lines) {
        console.error(line);
      }
    }
    return 0;
  }

  if (changed) {
    console.error(`Synced materialized manifest: ${ctx.materializedComposerPath}`);
  }

  return 0;
}
