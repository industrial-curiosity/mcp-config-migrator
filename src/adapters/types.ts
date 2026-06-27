import type { NormalizedConfig } from "../model/types.js";

export interface DefaultPathCandidate {
  /** Stable id for the scope this path belongs to, e.g. "user", "project". */
  scopeId: string;
  /** Human-readable label shown in CLI prompts, e.g. "User", "Project (.mcp.json)". */
  label: string;
  path: string;
  /** Optional secondary description shown alongside the path in the scope selection prompt. */
  hint?: string;
}

export interface DroppedExtraFields {
  serverName: string;
  fields: string[];
}

export interface SaveResult {
  /** Adapter-specific fields that couldn't be re-emitted because they came from a different IDE. */
  droppedFields: DroppedExtraFields[];
}

export interface IdeAdapter {
  id: string;
  label: string;
  resolveDefaultPaths(
    env: NodeJS.ProcessEnv,
    platform: NodeJS.Platform,
    cwd: string,
  ): DefaultPathCandidate[];
  load(path: string): Promise<NormalizedConfig>;
  save(path: string, normalized: NormalizedConfig): Promise<SaveResult>;
}
