import * as p from "@clack/prompts";
import { editText } from "./editor.js";
import { unwrap } from "./cancel.js";
import { MergeValidationError, parseMergedServer } from "../engine/mergeParse.js";
import type { ManualEdits } from "../engine/summary.js";
import type { NormalizedConfig, NormalizedMcpServer } from "../model/types.js";

export type { ManualEdits };

export const SKIP_HEADER = "// To SKIP this server, clear all content and save.";

/** Returns true when the editor content (after stripping the skip header) signals that the server should be omitted. */
export function isSkipSignal(text: string): boolean {
  const body = text.startsWith(SKIP_HEADER) ? text.slice(SKIP_HEADER.length) : text;
  return /^\s*(\{\s*\})?\s*$/.test(body);
}

function serverToEditableJson(server: NormalizedMcpServer): string {
  const { name: _name, extra: _extra, ...rest } = server;
  return JSON.stringify(rest, null, 2);
}

async function editServer(
  server: NormalizedMcpServer,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): Promise<NormalizedMcpServer | "skip"> {
  const original = `${SKIP_HEADER}\n${serverToEditableJson(server)}\n`;
  let current = original;

  for (;;) {
    const result = await editText(current, env, platform);

    if (isSkipSignal(result)) {
      return "skip";
    }

    const body = result.startsWith(SKIP_HEADER) ? result.slice(SKIP_HEADER.length).trimStart() : result;
    try {
      return parseMergedServer(server.name, body);
    } catch (err) {
      if (!(err instanceof MergeValidationError)) throw err;
      current = result;
      p.log.error(err.message);
      const choice = await p.select<"fix" | "redo">({
        message: "Resolve the error:",
        options: [
          { value: "fix", label: "Fix — reopen the editor with your edits kept" },
          { value: "redo", label: "Redo — reopen the editor with the original definition" },
        ],
      });
      if (unwrap(choice) === "redo") {
        current = original;
      }
    }
  }
}

export async function editMergedServers(
  merged: NormalizedConfig,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): Promise<{ updatedConfig: NormalizedConfig; manualEdits: ManualEdits }> {
  const manualEdits: ManualEdits = { edited: new Set(), skipped: new Set() };

  if (merged.servers.length === 0) {
    return { updatedConfig: merged, manualEdits };
  }

  const selected = await p.multiselect({
    message: "Edit any server before writing? (clear the editor to skip a server — none required)",
    options: merged.servers.map((s) => ({ value: s.name, label: s.name })),
    required: false,
  });

  if (p.isCancel(selected) || (selected as string[]).length === 0) {
    return { updatedConfig: merged, manualEdits };
  }

  const toEdit = selected as string[];
  const serverMap = new Map(merged.servers.map((s) => [s.name, s]));

  for (const name of toEdit) {
    const server = serverMap.get(name);
    if (!server) continue;

    const result = await editServer(server, env, platform);

    if (result === "skip") {
      p.log.info(`Skipped: ${name}`);
      manualEdits.skipped.add(name);
      serverMap.delete(name);
    } else {
      manualEdits.edited.add(name);
      serverMap.set(name, result);
    }
  }

  const updatedServers = merged.servers
    .filter((s) => serverMap.has(s.name))
    .map((s) => serverMap.get(s.name)!);

  return { updatedConfig: { servers: updatedServers }, manualEdits };
}
