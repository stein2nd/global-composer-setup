import type { ConstraintMap, SectionDiff, SyncReport } from './types.ts';

export function diffSections(before: ConstraintMap = {}, after: ConstraintMap = {}): SectionDiff {
  const added = [];
  const updated = [];
  const removed = [];

  for (const [name, range] of Object.entries(after)) {
    if (!Object.hasOwn(before, name)) {
      added.push({ name, range });
    } else if (before[name] !== range) {
      updated.push({ name, from: before[name], to: range });
    }
  }

  for (const name of Object.keys(before)) {
    if (!Object.hasOwn(after, name)) {
      removed.push({ name, range: before[name] });
    }
  }

  return { added, updated, removed };
}

export function buildReport(
  before: { require?: ConstraintMap; requireDev?: ConstraintMap } | null,
  after: { require: ConstraintMap; requireDev: ConstraintMap },
): SyncReport {
  return {
    require: diffSections(before?.require, after.require),
    requireDev: diffSections(before?.requireDev, after.requireDev),
  };
}

export function hasReportChanges(report: SyncReport): boolean {
  for (const section of Object.values(report)) {
    if (section.added.length > 0 || section.updated.length > 0 || section.removed.length > 0) {
      return true;
    }
  }

  return false;
}

export function formatReport(report: SyncReport): string[] {
  const lines: string[] = [];
  const sections: Array<[string, SectionDiff]> = [
    ['require', report.require],
    ['require-dev', report.requireDev],
  ];

  for (const [sectionName, section] of sections) {
    for (const { name, range } of section.added) {
      lines.push(`+ ${sectionName} ${name}:${range}`);
    }
    for (const { name, from, to } of section.updated) {
      lines.push(`~ ${sectionName} ${name}: ${from} -> ${to}`);
    }
    for (const { name, range } of section.removed) {
      lines.push(`- ${sectionName} ${name}:${range}`);
    }
  }

  return lines;
}
