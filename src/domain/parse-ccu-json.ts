import type { CcuPackageUpdate } from './types.ts';

type CcuJsonEntry = {
  constraint?: string;
  installed?: string;
  dev?: boolean;
  inRange?: string | null;
  latest?: string | null;
  suggestedConstraint?: string;
};

export function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function parseCcuJson(stdout: string): CcuPackageUpdate[] {
  const data = extractJsonObject(stdout);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return [];
  }

  const updates: CcuPackageUpdate[] = [];

  for (const [pkg, raw] of Object.entries(data as Record<string, CcuJsonEntry>)) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    updates.push({
      package: pkg,
      constraint: typeof raw.constraint === 'string' ? raw.constraint : '',
      installed: typeof raw.installed === 'string' ? raw.installed : undefined,
      dev: Boolean(raw.dev),
      inRange: raw.inRange ?? null,
      latest: raw.latest ?? null,
      suggestedConstraint:
        typeof raw.suggestedConstraint === 'string' ? raw.suggestedConstraint : undefined,
    });
  }

  return updates;
}
