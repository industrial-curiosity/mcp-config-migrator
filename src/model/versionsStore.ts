import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { NormalizedMcpServer } from "./types.js";

export type BackupPreference = "alwaysAsk" | "alwaysOn" | "alwaysOff";

export interface BackupVersion {
  timestamp: string;
  ideId: string;
  scopeId: string;
  path: string;
  servers: NormalizedMcpServer[];
}

interface SettingsFile {
  configured?: BackupPreference;
  backupLocation?: string;
  versions?: BackupVersion[];
}

export interface VersionsStore {
  settingsPath: string;
  configured: BackupPreference;
  backupLocation?: string;
  /** The file `versions` is actually read from/written to: `backupLocation` if set, otherwise `settingsPath`. */
  versionsPath: string;
  versions: BackupVersion[];
}

export function defaultSettingsPath(): string {
  return join(homedir(), "mcp-config-migrator.versions.json");
}

async function readJsonFile(path: string): Promise<SettingsFile> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as SettingsFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

async function writeJsonFile(path: string, data: SettingsFile): Promise<void> {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readVersionsStore(settingsPath: string): Promise<VersionsStore> {
  const settings = await readJsonFile(settingsPath);
  const configured = settings.configured ?? "alwaysAsk";
  const backupLocation = settings.backupLocation;
  const versionsPath = backupLocation ?? settingsPath;
  const versions = backupLocation ? (await readJsonFile(versionsPath)).versions ?? [] : settings.versions ?? [];
  return { settingsPath, configured, backupLocation, versionsPath, versions };
}

export async function setPreference(settingsPath: string, configured: BackupPreference): Promise<void> {
  const settings = await readJsonFile(settingsPath);
  await writeJsonFile(settingsPath, { ...settings, configured });
}

export async function setBackupLocation(settingsPath: string, backupLocation: string | undefined): Promise<void> {
  const settings = await readJsonFile(settingsPath);
  const next: SettingsFile = { ...settings };
  if (backupLocation) {
    next.backupLocation = backupLocation;
  } else {
    delete next.backupLocation;
  }
  await writeJsonFile(settingsPath, next);
}

/** Appends `entry` to the resolved store's version history without altering or removing any existing entry. */
export async function appendVersion(settingsPath: string, entry: BackupVersion): Promise<void> {
  const store = await readVersionsStore(settingsPath);
  const versions = [...store.versions, entry];
  if (store.backupLocation) {
    await writeJsonFile(store.versionsPath, { versions });
  } else {
    const settings = await readJsonFile(settingsPath);
    await writeJsonFile(settingsPath, { ...settings, versions });
  }
}
