import type { ClassifiedEntry } from "./classify.js";
import type { ConflictResolutions } from "./merge.js";

export interface ManualEdits {
  edited: Set<string>;
  skipped: Set<string>;
}

export interface CategorySummary {
  count: number;
  names: string[];
}

export interface MigrationSummary {
  added: CategorySummary;
  unchanged: CategorySummary;
  skipped: CategorySummary;
  conflicts: {
    total: number;
    acceptTarget: CategorySummary;
    acceptSource: CategorySummary;
    merged: CategorySummary;
  };
}

function toCategory(names: string[]): CategorySummary {
  return { count: names.length, names };
}

export function summarize(
  classifications: ClassifiedEntry[],
  resolutions: ConflictResolutions,
  manualEdits: ManualEdits = { edited: new Set(), skipped: new Set() },
): MigrationSummary {
  const added: string[] = [];
  const unchanged: string[] = [];
  const skipped: string[] = [];
  const acceptTarget: string[] = [];
  const acceptSource: string[] = [];
  const merged: string[] = [];

  for (const entry of classifications) {
    if (manualEdits.skipped.has(entry.name)) {
      skipped.push(entry.name);
    } else if (entry.kind === "add") {
      added.push(entry.name);
    } else if (entry.kind === "unchanged") {
      if (manualEdits.edited.has(entry.name)) {
        merged.push(entry.name);
      } else {
        unchanged.push(entry.name);
      }
    } else {
      const resolution = resolutions[entry.name] ?? { kind: "accept-target" };
      if (resolution.kind === "merge" || manualEdits.edited.has(entry.name)) {
        merged.push(entry.name);
      } else if (resolution.kind === "accept-source") {
        acceptSource.push(entry.name);
      } else {
        acceptTarget.push(entry.name);
      }
    }
  }

  return {
    added: toCategory(added),
    unchanged: toCategory(unchanged),
    skipped: toCategory(skipped),
    conflicts: {
      total: acceptTarget.length + acceptSource.length + merged.length,
      acceptTarget: toCategory(acceptTarget),
      acceptSource: toCategory(acceptSource),
      merged: toCategory(merged),
    },
  };
}

/** True when a migration has nothing to add and nothing to resolve. */
export function isNoOp(classifications: ClassifiedEntry[]): boolean {
  return classifications.every((entry) => entry.kind === "unchanged");
}
