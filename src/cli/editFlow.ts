import * as p from "@clack/prompts";
import { getAdapter } from "../adapters/registry.js";
import { defaultSettingsPath } from "../model/versionsStore.js";
import { maybeBackup } from "./backupFlow.js";
import { unwrap, withCancelHandling } from "./cancel.js";
import { editMergedServers } from "./editStep.js";
import { selectIde, selectScopeAndPath, type RunCliOptions } from "./flow.js";

async function runEditFlow(options: RunCliOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const settingsPath = options.settingsPath ?? defaultSettingsPath();

  p.intro("mcp-config-migrator");
  const ideId = await selectIde("Edit MCP servers for which IDE?");
  const adapter = getAdapter(ideId);
  const target = await selectScopeAndPath(adapter.label, adapter.resolveDefaultPaths(env, platform, cwd));
  const config = await adapter.load(target.path);
  const { updatedConfig, manualEdits } = await editMergedServers(config, env, platform);

  const changed = [...manualEdits.edited];
  const deleted = [...manualEdits.skipped];
  p.note(
    [
      changed.length === 0 ? "Edited (0)" : `Edited (${changed.length}): ${changed.join(", ")}`,
      deleted.length === 0 ? "Deleted (0)" : `Deleted (${deleted.length}): ${deleted.join(", ")}`,
    ].join("\n"),
    "Edit summary",
  );
  const confirmed = unwrap(await p.confirm({ message: `Write edited config to ${target.path}?` }));
  if (!confirmed) {
    p.outro("No changes were made.");
    return;
  }

  const affected = [...new Set([...changed, ...deleted])];
  if (adapter.id === "claude-code" && target.scopeId === "project" && affected.length > 0) {
    p.note(
      [
        `Claude Code will ask you to re-approve: ${affected.join(", ")}`,
        "If you'd rather not be prompted again, run:",
        "  claude mcp reset-project-choices",
      ].join("\n"),
      "Heads up",
    );
  }
  if (adapter.id === "pi") {
    p.note(
      "Pi has no built-in MCP support. Install pi-mcp-adapter first:\n\n  pi install npm:pi-mcp-adapter\n\nRestart Pi after installation.",
      "Prerequisites for Pi",
    );
  }

  await maybeBackup(settingsPath, { ideId: adapter.id, scopeId: target.scopeId, path: target.path, config });
  const result = await adapter.save(target.path, updatedConfig);
  for (const dropped of result.droppedFields) {
    p.log.warn(`Dropped fields for "${dropped.serverName}" not supported by ${adapter.label}: ${dropped.fields.join(", ")}`);
  }
  p.log.success(`Wrote edited config to ${target.path}`);
  p.outro("Done.");
}

export async function runEditCli(options: RunCliOptions = {}): Promise<void> {
  await withCancelHandling(() => runEditFlow(options));
}
