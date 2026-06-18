import type { NormalizedConfig } from "../model/types.js";
import type { IdeAdapter, SaveResult } from "../adapters/types.js";
import { backupFile } from "../model/backup.js";

export interface SaveWithBackupResult extends SaveResult {
  backupPath: string | null;
}

/** Backs up an existing target file (if any), then writes the merged config through its adapter. */
export async function saveWithBackup(
  adapter: IdeAdapter,
  path: string,
  normalized: NormalizedConfig,
): Promise<SaveWithBackupResult> {
  const backupPath = await backupFile(path);
  const result = await adapter.save(path, normalized);
  return { ...result, backupPath };
}
