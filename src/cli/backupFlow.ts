import * as p from "@clack/prompts";
import type { NormalizedConfig } from "../model/types.js";
import { appendVersion, readVersionsStore, setBackupLocation, setPreference } from "../model/versionsStore.js";
import { unwrap } from "./cancel.js";

export interface BackupTarget {
  ideId: string;
  scopeId: string;
  path: string;
  config: NormalizedConfig;
}

type PromptChoice = "yes" | "yes-always" | "no" | "no-never";

/**
 * Decides whether to back up `target`'s current MCP servers based on the
 * persisted preference, prompting when the preference is "always ask".
 * Only the two "always" choices persist a new preference; plain "yes"/"no"
 * decide this run only.
 */
export async function maybeBackup(settingsPath: string, target: BackupTarget): Promise<void> {
  const store = await readVersionsStore(settingsPath);

  if (store.configured === "alwaysOff") return;
  if (store.configured === "alwaysOn") {
    await backupNow(settingsPath, store.versionsPath, target);
    return;
  }

  const choice = unwrap(
    await p.select<PromptChoice>({
      message: `Back up the current MCP servers in ${target.path} before writing?`,
      options: [
        { value: "yes", label: "Yes" },
        { value: "yes-always", label: "Yes, always" },
        { value: "no", label: "No" },
        { value: "no-never", label: "No, never" },
      ],
      initialValue: "yes-always",
    }),
  );

  if (choice === "yes" || choice === "yes-always") {
    const location = unwrap(
      await p.text({
        message: "Backup storage location:",
        initialValue: store.versionsPath,
      }),
    );
    if (location !== store.versionsPath) {
      await setBackupLocation(settingsPath, location === settingsPath ? undefined : location);
    }
    await backupNow(settingsPath, location, target);
  }
  if (choice === "yes-always") {
    await setPreference(settingsPath, "alwaysOn");
  } else if (choice === "no-never") {
    await setPreference(settingsPath, "alwaysOff");
  }
}

async function backupNow(settingsPath: string, versionsPath: string, target: BackupTarget): Promise<void> {
  await appendVersion(settingsPath, {
    timestamp: new Date().toISOString(),
    ideId: target.ideId,
    scopeId: target.scopeId,
    path: target.path,
    servers: target.config.servers,
  });
  p.log.success(`Backed up current MCP servers for ${target.path} to ${versionsPath}`);
}
