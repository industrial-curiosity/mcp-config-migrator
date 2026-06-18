import * as p from "@clack/prompts";
import { adapters, getAdapter } from "../adapters/registry.js";
import type { DefaultPathCandidate } from "../adapters/types.js";
import { classify, type ClassifiedEntry } from "../engine/classify.js";
import { renderConflictDiff } from "../engine/diff.js";
import { applyMerge, type ConflictResolution, type ConflictResolutions } from "../engine/merge.js";
import { isNoOp, summarize } from "../engine/summary.js";
import { saveWithBackup } from "../engine/write.js";
import type { NormalizedConfig } from "../model/types.js";

export interface RunCliOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}

class CliCancelled extends Error {}

function unwrap<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    throw new CliCancelled();
  }
  return value;
}

async function selectIde(message: string): Promise<string> {
  const choice = await p.select({
    message,
    options: adapters.map((adapter) => ({ value: adapter.id, label: adapter.label })),
  });
  return unwrap(choice);
}

async function selectScopeAndPath(
  ideLabel: string,
  candidates: DefaultPathCandidate[],
): Promise<{ scopeId: string; path: string }> {
  let candidate = candidates[0]!;
  if (candidates.length > 1) {
    const scopeId = await p.select({
      message: `Which ${ideLabel} config scope?`,
      options: candidates.map((c) => ({ value: c.scopeId, label: c.label, hint: c.path })),
    });
    candidate = candidates.find((c) => c.scopeId === unwrap(scopeId))!;
  }

  const path = await p.text({
    message: `Confirm the ${ideLabel} config path (${candidate.label}):`,
    initialValue: candidate.path,
    validate: (value) => (!value || value.trim() === "" ? "A path is required" : undefined),
  });
  return { scopeId: candidate.scopeId, path: unwrap(path) };
}

async function resolveConflicts(conflicts: ClassifiedEntry[]): Promise<ConflictResolutions> {
  const resolutions: ConflictResolutions = {};
  for (const entry of conflicts) {
    p.note(renderConflictDiff(entry), `Conflict: ${entry.name}`);
    const resolution = await p.select<ConflictResolution>({
      message: `Resolve "${entry.name}":`,
      options: [
        { value: "accept-target", label: "Accept target's definition" },
        { value: "accept-source", label: "Accept source's definition" },
      ],
    });
    resolutions[entry.name] = unwrap(resolution);
  }
  return resolutions;
}

function changedServerNames(classifications: ClassifiedEntry[], resolutions: ConflictResolutions): string[] {
  return classifications
    .filter(
      (entry) =>
        entry.kind === "add" || (entry.kind === "conflict" && resolutions[entry.name] === "accept-source"),
    )
    .map((entry) => entry.name);
}

async function runFlow(options: RunCliOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;

  p.intro("mcp-config-migrator");

  const sourceIdeId = await selectIde("Migrate MCP servers FROM which IDE?");
  const sourceAdapter = getAdapter(sourceIdeId);
  const source = await selectScopeAndPath(
    sourceAdapter.label,
    sourceAdapter.resolveDefaultPaths(env, platform, cwd),
  );

  const targetIdeId = await selectIde("Migrate MCP servers TO which IDE?");
  const targetAdapter = getAdapter(targetIdeId);
  const target = await selectScopeAndPath(
    targetAdapter.label,
    targetAdapter.resolveDefaultPaths(env, platform, cwd),
  );

  const sourceConfig = await sourceAdapter.load(source.path);
  const targetConfig = await targetAdapter.load(target.path);

  const classifications = classify(sourceConfig, targetConfig);

  if (isNoOp(classifications)) {
    p.outro("Nothing to migrate — target already has every source entry.");
    return;
  }

  const conflicts = classifications.filter((entry) => entry.kind === "conflict");
  const resolutions = await resolveConflicts(conflicts);

  const summary = summarize(classifications, resolutions);
  const formatCategory = (label: string, category: { count: number; names: string[] }): string =>
    category.count === 0 ? `${label} (0)` : `${label} (${category.count}): ${category.names.join(", ")}`;
  p.note(
    [
      formatCategory("Added", summary.added),
      formatCategory("Unchanged", summary.unchanged),
      `Conflicts resolved (${summary.conflicts.total}):`,
      `  ${formatCategory("accept target", summary.conflicts.acceptTarget)}`,
      `  ${formatCategory("accept source", summary.conflicts.acceptSource)}`,
    ].join("\n"),
    "Migration summary",
  );

  const confirmed = unwrap(await p.confirm({ message: `Write merged config to ${target.path}?` }));
  if (!confirmed) {
    p.outro("No changes were made.");
    return;
  }

  const merged = applyMerge(targetConfig, classifications, resolutions);

  if (targetAdapter.id === "claude-code" && target.scopeId === "project") {
    const names = changedServerNames(classifications, resolutions);
    if (names.length > 0) {
      p.note(
        [
          `Claude Code will ask you to re-approve: ${names.join(", ")}`,
          "If you'd rather not be prompted again, run:",
          "  claude mcp reset-project-choices",
        ].join("\n"),
        "Heads up",
      );
    }
  }

  const saveResult = await saveWithBackup(targetAdapter, target.path, merged);
  for (const dropped of saveResult.droppedFields) {
    p.log.warn(`Dropped fields for "${dropped.serverName}" not supported by ${targetAdapter.label}: ${dropped.fields.join(", ")}`);
  }
  if (saveResult.backupPath) {
    p.log.info(`Backed up previous config to ${saveResult.backupPath}`);
  }
  p.log.success(`Wrote merged config to ${target.path}`);

  await runCleanup(targetAdapter, target.path, merged);

  p.outro("Done.");
}

async function runCleanup(
  targetAdapter: ReturnType<typeof getAdapter>,
  targetPath: string,
  merged: NormalizedConfig,
): Promise<void> {
  if (merged.servers.length === 0) return;

  const result = await p.multiselect({
    message: "Remove any MCP servers from the target before finishing? (none required)",
    options: merged.servers.map((server) => ({ value: server.name, label: server.name })),
    required: false,
  });
  if (p.isCancel(result)) {
    p.log.info("Skipped cleanup.");
    return;
  }
  const toRemove = result;

  if (toRemove.length === 0) return;

  const remaining: NormalizedConfig = {
    servers: merged.servers.filter((server) => !toRemove.includes(server.name)),
  };
  await targetAdapter.save(targetPath, remaining);
  p.log.success(`Removed: ${toRemove.join(", ")}`);
}

export async function runCli(options: RunCliOptions = {}): Promise<void> {
  try {
    await runFlow(options);
  } catch (err) {
    if (err instanceof CliCancelled) {
      p.cancel("Migration cancelled.");
      return;
    }
    throw err;
  }
}
