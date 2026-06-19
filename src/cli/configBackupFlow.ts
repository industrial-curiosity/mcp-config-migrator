import * as p from "@clack/prompts";
import {
  defaultSettingsPath,
  readVersionsStore,
  setBackupLocation,
  setPreference,
  type BackupPreference,
} from "../model/versionsStore.js";
import { unwrap, withCancelHandling } from "./cancel.js";

export interface RunConfigBackupOptions {
  settingsPath?: string;
}

const PREFERENCE_LABELS: Record<BackupPreference, string> = {
  alwaysAsk: "Always ask",
  alwaysOn: "Always back up",
  alwaysOff: "Never back up",
};

async function configBackupFlow(options: RunConfigBackupOptions): Promise<void> {
  const settingsPath = options.settingsPath ?? defaultSettingsPath();

  p.intro("mcp-config-migrator config backup");

  const store = await readVersionsStore(settingsPath);
  p.note(
    [`Backup preference: ${PREFERENCE_LABELS[store.configured]}`, `Storage location: ${store.versionsPath}`].join("\n"),
    "Current settings",
  );

  const preference = unwrap(
    await p.select<BackupPreference>({
      message: "Backup preference:",
      options: (Object.keys(PREFERENCE_LABELS) as BackupPreference[]).map((value) => ({
        value,
        label: PREFERENCE_LABELS[value],
      })),
      initialValue: store.configured,
    }),
  );
  if (preference !== store.configured) {
    await setPreference(settingsPath, preference);
  }

  const location = unwrap(
    await p.text({
      message: "Storage location for the version history:",
      initialValue: store.versionsPath,
    }),
  );
  const nextLocation = location === settingsPath ? undefined : location;
  if (nextLocation !== store.backupLocation) {
    await setBackupLocation(settingsPath, nextLocation);
  }

  p.outro("Backup settings updated.");
}

export async function runConfigBackup(options: RunConfigBackupOptions = {}): Promise<void> {
  await withCancelHandling(() => configBackupFlow(options));
}
