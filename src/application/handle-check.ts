import { runCcuCheck } from '../adapters/ccu.ts';
import type { SetupContext } from '../domain/types.ts';
import { prepare } from './prepare.ts';

export function handleCheck(ctx: SetupContext): number {
  prepare(ctx);
  return runCcuCheck(ctx.setupDir);
}
