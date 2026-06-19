import type { ClassifiedEntry } from "./classify.js";
import type { ConflictResolutions } from "./merge.js";

export interface CategorySummary {
  count: number;
  names: string[];
}

export interface MigrationSummary {
  added: CategorySummary;
  unchanged: CategorySummary;
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
): MigrationSummary {
  const added: string[] = [];
  const unchanged: string[] = [];
  const acceptTarget: string[] = [];
  const acceptSource: string[] = [];
  const merged: string[] = [];

  for (const entry of classifications) {
    if (entry.kind === "add") {
      added.push(entry.name);
    } else if (entry.kind === "unchanged") {
      unchanged.push(entry.name);
    } else {
      const resolution = resolutions[entry.name] ?? { kind: "accept-target" };
      if (resolution.kind === "accept-target") acceptTarget.push(entry.name);
      else if (resolution.kind === "accept-source") acceptSource.push(entry.name);
      else merged.push(entry.name);
    }
  }

  return {
    added: toCategory(added),
    unchanged: toCategory(unchanged),
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
