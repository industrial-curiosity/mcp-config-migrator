import * as p from "@clack/prompts";
import { getAdapter } from "../adapters/registry.js";
import { defaultSettingsPath, readVersionsStore, type BackupVersion } from "../model/versionsStore.js";
import { unwrap, withCancelHandling } from "./cancel.js";

export interface RunRestoreOptions {
  filePath?: string;
}

function formatVersionLabel(version: BackupVersion): string {
  const adapter = getAdapter(version.ideId);
  return `${version.timestamp} — ${adapter.label} (${version.scopeId}) — ${version.path}`;
}

async function restoreFlow(options: RunRestoreOptions): Promise<void> {
  p.intro("mcp-config-migrator restore");

  let settingsPath = options.filePath;
  if (!settingsPath) {
    settingsPath = unwrap(
      await p.text({
        message: "Path to the versions file to restore from:",
        initialValue: defaultSettingsPath(),
      }),
    );
  }

  const store = await readVersionsStore(settingsPath);
  if (store.versions.length === 0) {
    p.outro(`No backed-up versions found in ${store.versionsPath}.`);
    return;
  }

  const sorted = [...store.versions].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const selectedIndex = unwrap(
    await p.select({
      message: "Select a version to restore:",
      options: sorted.map((version, index) => ({ value: index, label: formatVersionLabel(version) })),
    }),
  );
  const version = sorted[selectedIndex]!;

  p.note(JSON.stringify(version.servers, null, 2), `Preview: ${formatVersionLabel(version)}`);

  const confirmed = unwrap(await p.confirm({ message: `Overwrite ${version.path} with this version?` }));
  if (!confirmed) {
    p.outro("Restore cancelled. No changes were made.");
    return;
  }

  const adapter = getAdapter(version.ideId);

  if (adapter.id === "pi") {
    p.note(
      "Pi has no built-in MCP support. Install pi-mcp-adapter first:\n\n  pi install npm:pi-mcp-adapter\n\nRestart Pi after installation.",
      "Prerequisites for Pi",
    );
  }

  await adapter.save(version.path, { servers: version.servers });
  p.log.success(`Restored ${version.path} from ${version.timestamp}.`);
  p.outro("Done.");
}

export async function runRestore(options: RunRestoreOptions = {}): Promise<void> {
  await withCancelHandling(() => restoreFlow(options));
}
