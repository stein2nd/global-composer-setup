import fs from 'node:fs';
import path from 'node:path';

import type { ConstraintMap, SetupContext, UserDeps } from '../domain/types.ts';

export const EMPTY_USER_DEPS: UserDeps = {
  require: {},
  requireDev: {},
};

type JsonRecord = Record<string, unknown>;

export function readJson(filePath: string): JsonRecord | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as JsonRecord;
}

export function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 4)}\n`, 'utf8');
}

export function ensureSetupDir(ctx: SetupContext): void {
  fs.mkdirSync(ctx.setupDir, { recursive: true });

  if (!fs.existsSync(ctx.userDepsPath)) {
    writeJson(ctx.userDepsPath, {
      require: {},
      'require-dev': {},
    });
  }
}

export function readConstraintMap(value: unknown): ConstraintMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const result: ConstraintMap = {};
  for (const [name, constraint] of Object.entries(value as Record<string, unknown>)) {
    if (typeof constraint === 'string') {
      result[name] = constraint;
    }
  }
  return result;
}

export function readUserDeps(ctx: SetupContext): UserDeps {
  const data = readJson(ctx.userDepsPath);
  return {
    require: readConstraintMap(data?.require),
    requireDev: readConstraintMap(data?.['require-dev']),
  };
}

export function writeUserDeps(ctx: SetupContext, userDeps: UserDeps): void {
  writeJson(ctx.userDepsPath, {
    require: userDeps.require,
    'require-dev': userDeps.requireDev,
  });
}

export function readMaterialized(filePath: string): {
  require: ConstraintMap;
  requireDev: ConstraintMap;
} | null {
  const data = readJson(filePath);
  if (!data) {
    return null;
  }

  return {
    require: readConstraintMap(data.require),
    requireDev: readConstraintMap(data['require-dev']),
  };
}

export function readRequire(filePath: string): ConstraintMap {
  return readMaterialized(filePath)?.require ?? {};
}
