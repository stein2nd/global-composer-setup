const UNSTABLE = /(?:^dev-)|-(?:dev|alpha|a|beta|b|rc|preview)\d*/i;

export function isStableVersion(version: string): boolean {
  const normalized = version.trim().replace(/^v/i, '');
  if (!normalized) {
    return false;
  }

  return !UNSTABLE.test(normalized) && !normalized.startsWith('dev-');
}

export function parseLatestStable(stdout: string): string | undefined {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    const versions = collectVersions(parsed);
    const stable = versions.find((version) => isStableVersion(version));
    if (stable) {
      return stripVersionPrefix(stable);
    }
  } catch {
    const match = trimmed.match(/\b(?:v)?(\d+\.\d+\.\d+(?:[.-][0-9A-Za-z]+)?)\b/);
    if (match && isStableVersion(match[1])) {
      return stripVersionPrefix(match[1]);
    }
  }

  return undefined;
}

function collectVersions(parsed: unknown): string[] {
  if (typeof parsed === 'string' && parsed) {
    return [parsed];
  }

  if (Array.isArray(parsed)) {
    return parsed.filter((item): item is string => typeof item === 'string');
  }

  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  const record = parsed as Record<string, unknown>;

  if (typeof record.latest === 'string') {
    return [record.latest];
  }

  if (typeof record.version === 'string') {
    return [record.version];
  }

  if (Array.isArray(record.versions)) {
    return record.versions.filter((item): item is string => typeof item === 'string');
  }

  if (record.versions && typeof record.versions === 'object') {
    return Object.keys(record.versions as Record<string, unknown>);
  }

  return [];
}

function stripVersionPrefix(version: string): string {
  return version.trim().replace(/^v/i, '');
}
