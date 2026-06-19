export type { NormalizedConfig, NormalizedMcpServer, Transport, ExtraFields } from "./model/types.js";
export { areServersEqual } from "./model/equality.js";
export type { BackupPreference, BackupVersion, VersionsStore } from "./model/versionsStore.js";
export {
  defaultSettingsPath,
  readVersionsStore,
  appendVersion,
  setPreference,
  setBackupLocation,
} from "./model/versionsStore.js";

export type { IdeAdapter, DefaultPathCandidate, SaveResult, DroppedExtraFields } from "./adapters/types.js";
export { adapters, getAdapter } from "./adapters/registry.js";

export type { ClassificationKind, ClassifiedEntry } from "./engine/classify.js";
export { classify } from "./engine/classify.js";
export { renderConflictDiff, renderMergeScaffold } from "./engine/diff.js";
export type { ConflictResolution, ConflictResolutions } from "./engine/merge.js";
export { applyMerge } from "./engine/merge.js";
export type { MigrationSummary } from "./engine/summary.js";
export { summarize, isNoOp } from "./engine/summary.js";
