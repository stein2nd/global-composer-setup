import fs from 'node:fs';
import path from 'node:path';

export const MANUAL_OS = ['macos', 'windows'] as const;
export type ManualOs = (typeof MANUAL_OS)[number];

export type ManualStatus = 'PASS' | 'WARN' | 'FAIL' | 'PENDING';

export type ManualOsResult = {
  status: ManualStatus;
  date?: string;
  note?: string;
};

export type ManualItem = {
  id: string;
  spec: string;
  condition: string;
  methods: Record<ManualOs, string>;
  results: Record<ManualOs, ManualOsResult>;
};

export type ManualCatalog = {
  items: ManualItem[];
};

export type ManualRow = {
  id: string;
  spec: string;
  condition: string;
  os: ManualOs;
  osLabel: string;
  method: string;
  status: ManualStatus;
  date?: string;
  note?: string;
};

export const MANUAL_OS_LABEL: Record<ManualOs, string> = {
  macos: 'macOS',
  windows: 'Windows 11',
};

const STATUSES = new Set<ManualStatus>(['PASS', 'WARN', 'FAIL', 'PENDING']);

export function manualCatalogPath(root: string): string {
  return path.join(root, 'test', 'manual-tests.json');
}

export function loadManualCatalog(root: string): ManualCatalog {
  return JSON.parse(fs.readFileSync(manualCatalogPath(root), 'utf8')) as ManualCatalog;
}

export function flattenManualRows(catalog: ManualCatalog): ManualRow[] {
  return catalog.items.flatMap((item) =>
    MANUAL_OS.map((os) => {
      const result = item.results[os];
      return {
        id: item.id,
        spec: item.spec,
        condition: item.condition,
        os,
        osLabel: MANUAL_OS_LABEL[os],
        method: item.methods[os],
        status: result.status,
        date: result.date,
        note: result.note,
      };
    }),
  );
}

export function assertManualCatalog(catalog: ManualCatalog): void {
  if (!Array.isArray(catalog.items) || catalog.items.length === 0) {
    throw new Error('manual-tests.json must have a non-empty items array');
  }

  const seen = new Set<string>();
  for (const item of catalog.items) {
    if (!item.id || seen.has(item.id)) {
      throw new Error(`duplicate or empty manual test id: ${item.id}`);
    }
    seen.add(item.id);

    for (const os of MANUAL_OS) {
      if (!item.methods[os]?.trim()) {
        throw new Error(`${item.id} is missing a ${os} method`);
      }
      const status = item.results[os]?.status;
      if (!status || !STATUSES.has(status)) {
        throw new Error(`${item.id} ${os} has invalid status: ${String(status)}`);
      }
    }
  }
}
