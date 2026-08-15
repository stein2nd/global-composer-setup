import { spawnSync, type SpawnSyncOptions, type SpawnSyncReturns } from 'node:child_process';

export type SpawnFn = (
  command: string,
  args: string[],
  options: SpawnSyncOptions,
) => SpawnSyncReturns<string | Buffer>;

export function useShell(): boolean {
  return process.platform === 'win32';
}

export function runCommand(
  command: string,
  args: string[],
  {
    spawn = spawnSync,
    inherit = true,
    cwd,
  }: {
    spawn?: SpawnFn;
    inherit?: boolean;
    cwd?: string;
  } = {},
): SpawnSyncReturns<string> {
  const result = spawn(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
    shell: useShell(),
  });

  return result as SpawnSyncReturns<string>;
}

export function exitStatus(result: SpawnSyncReturns<string>): number {
  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
}
