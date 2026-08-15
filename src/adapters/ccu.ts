import { captureComposer, runComposer } from './composer.ts';
import type { SpawnFn } from './spawn.ts';

function ccuArgs(setupDir: string, extra: string[]): string[] {
  return ['--working-dir', setupDir, 'check-updates', ...extra];
}

export function runCcuCheck(setupDir: string, options: { spawn?: SpawnFn } = {}): number {
  return runComposer(ccuArgs(setupDir, ['--dry-run']), options);
}

export function captureCcuJson(
  setupDir: string,
  options: { spawn?: SpawnFn } = {},
): { status: number; stdout: string; stderr: string } {
  return captureComposer(ccuArgs(setupDir, ['--dry-run', '--format', 'json']), options);
}
