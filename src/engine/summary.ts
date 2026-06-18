import type { ClassifiedEntry } from "./classify.js";
import type { ConflictResolutions } from "./merge.js";

export interface MigrationSummary {
  added: number;
  unchanged: number;
  conflicts: {
    total: number;
    keepTarget: number;
    takeSource: number;
    skip: number;
  };
}

export function summarize(
  classifications: ClassifiedEntry[],
  resolutions: ConflictResolutions,
): MigrationSummary {
  let added = 0;
  let unchanged = 0;
  let keepTarget = 0;
  let takeSource = 0;
  let skip = 0;

  for (const entry of classifications) {
    if (entry.kind === "add") {
      added++;
    } else if (entry.kind === "unchanged") {
      unchanged++;
    } else {
      const resolution = resolutions[entry.name] ?? "keep-target";
      if (resolution === "keep-target") keepTarget++;
      else if (resolution === "take-source") takeSource++;
      else skip++;
    }
  }

  return {
    added,
    unchanged,
    conflicts: { total: keepTarget + takeSource + skip, keepTarget, takeSource, skip },
  };
}

/** True when a migration has nothing to add and nothing to resolve. */
export function isNoOp(classifications: ClassifiedEntry[]): boolean {
  return classifications.every((entry) => entry.kind === "unchanged");
}
