import { captureCcuJson } from '../adapters/ccu.ts';
import { readMaterialized, writeJson } from '../adapters/json-io.ts';
import { applyCcuUpdates } from '../domain/apply-ccu-updates.ts';
import {
  MATERIALIZED_DESCRIPTION,
  MATERIALIZED_NAME,
  PHP_CONSTRAINT,
  PHP_PACKAGE,
} from '../domain/constants.ts';
import { toComposerJson } from '../domain/materialized.ts';
import { parseCcuJson } from '../domain/parse-ccu-json.ts';
import type { SetupContext } from '../domain/types.ts';
import { prepare } from './prepare.ts';

export function handleUpdate(ctx: SetupContext): number {
  prepare(ctx);

  const captured = captureCcuJson(ctx.setupDir);
  if (captured.stderr) {
    process.stderr.write(captured.stderr);
  }

  if (captured.status !== 0) {
    if (captured.stdout) {
      process.stdout.write(captured.stdout);
    }
    return captured.status;
  }

  const current = readMaterialized(ctx.materializedComposerPath) ?? {
    require: { [PHP_PACKAGE]: PHP_CONSTRAINT },
    requireDev: {},
  };

  const next = applyCcuUpdates(
    {
      name: MATERIALIZED_NAME,
      description: MATERIALIZED_DESCRIPTION,
      require: current.require,
      requireDev: current.requireDev,
    },
    parseCcuJson(captured.stdout),
  );

  writeJson(ctx.materializedComposerPath, toComposerJson(next));

  if (captured.stdout.trim()) {
    process.stdout.write(captured.stdout.endsWith('\n') ? captured.stdout : `${captured.stdout}\n`);
  }

  return 0;
}
