import type { NormalizedConfig, NormalizedMcpServer } from "../model/types.js";
import type { ClassifiedEntry } from "./classify.js";

export type ConflictResolution =
  | { kind: "accept-target" }
  | { kind: "accept-source" }
  | { kind: "merge"; merged: NormalizedMcpServer };

export type ConflictResolutions = Record<string, ConflictResolution>;

/**
 * Produces the merged config: every Add entry from source, every Conflict
 * entry per its resolution, every Unchanged entry as-is, and every
 * target-only entry left untouched.
 */
export function applyMerge(
  target: NormalizedConfig,
  classifications: ClassifiedEntry[],
  resolutions: ConflictResolutions,
): NormalizedConfig {
  const resultByName = new Map(target.servers.map((server) => [server.name, server]));

  for (const entry of classifications) {
    if (entry.kind === "add") {
      resultByName.set(entry.name, entry.source);
    } else if (entry.kind === "conflict") {
      const resolution = resolutions[entry.name] ?? { kind: "accept-target" };
      if (resolution.kind === "accept-source") {
        resultByName.set(entry.name, entry.source);
      } else if (resolution.kind === "merge") {
        resultByName.set(entry.name, resolution.merged);
      }
      // accept-target: target's existing value is already in the map.
    }
  }

  return { servers: Array.from(resultByName.values()) };
}
