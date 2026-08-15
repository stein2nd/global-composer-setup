import path from 'node:path';

import { CCU_PACKAGE } from '../domain/constants.ts';
import { exitStatus, runCommand, type SpawnFn } from './spawn.ts';

export function runComposer(
  args: string[],
  options: { spawn?: SpawnFn; inherit?: boolean; cwd?: string } = {},
): number {
  const result = runCommand('composer', args, { inherit: true, ...options });
  return exitStatus(result);
}

export function captureComposer(
  args: string[],
  options: { spawn?: SpawnFn; cwd?: string } = {},
): { status: number; stdout: string; stderr: string } {
  const result = runCommand('composer', args, { inherit: false, ...options });
  return {
    status: result.error ? 1 : (result.status ?? 1),
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

export function resolveComposerHome(options: { spawn?: SpawnFn } = {}): string {
  const fromEnv = process.env.COMPOSER_HOME?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  const result = captureComposer(['global', 'config', 'home'], options);
  const line = result.stdout
    .trim()
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .pop();

  if (!line) {
    throw new Error('Failed to resolve COMPOSER_HOME via `composer global config home`.');
  }

  return line;
}

export function allowCcuPlugin(options: { spawn?: SpawnFn } = {}): number {
  return runComposer(['global', 'config', `allow-plugins.${CCU_PACKAGE}`, 'true'], options);
}
