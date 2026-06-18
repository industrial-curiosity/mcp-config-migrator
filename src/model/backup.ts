import { copyFile, access } from "node:fs/promises";

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * Writes a timestamped copy of `filePath` alongside itself before it is
 * overwritten. Returns the backup path, or `null` if `filePath` doesn't
 * exist yet (nothing to back up).
 */
export async function backupFile(filePath: string): Promise<string | null> {
  try {
    await access(filePath);
  } catch {
    return null;
  }
  const backupPath = `${filePath}.bak.${timestamp()}`;
  await copyFile(filePath, backupPath);
  return backupPath;
}
