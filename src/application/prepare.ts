import { ensureSetupDir } from '../adapters/json-io.ts';
import type { SetupContext } from '../domain/types.ts';
import { syncManifest, type SyncResult } from './sync-manifest.ts';

export function prepare(ctx: SetupContext): SyncResult {
  ensureSetupDir(ctx);
  return syncManifest(ctx);
}
