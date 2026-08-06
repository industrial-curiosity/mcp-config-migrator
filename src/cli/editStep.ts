import * as p from "@clack/prompts";
import { editText } from "./editor.js";
import { unwrap } from "./cancel.js";
import { MergeValidationError, parseMergedServer } from "../engine/mergeParse.js";
import type { ManualEdits } from "../engine/summary.js";
import type { NormalizedConfig, NormalizedMcpServer } from "../model/types.js";

export type { ManualEdits };

export const SKIP_HEADER = "// To SKIP this server, clear all content and save.";

function uniqueAction(base: string, names: Iterable<string>): string {
  const existing = new Set(names);
  let action = base;
  let suffix = 2;
  while (existing.has(action)) {
    action = `${base}-${suffix++}`;
  }
  return action;
}

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

async function addServer(
  serverMap: Map<string, NormalizedMcpServer>,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): Promise<NormalizedMcpServer | "skip"> {
  const nameInput = await p.text({
    message: "Name for the new MCP server:",
    validate: (value) => {
      const name = value?.trim() ?? "";
      if (name === "") return "A server name is required";
      if (serverMap.has(name)) return `A server named "${name}" already exists`;
      return undefined;
    },
  });
  const name = unwrap(nameInput).trim();
  const transport = unwrap(
    await p.select<"stdio" | "http" | "sse">({
      message: `Transport for "${name}":`,
      options: [
        { value: "stdio", label: "stdio" },
        { value: "http", label: "http" },
        { value: "sse", label: "sse" },
      ],
    }),
  );
  const template: NormalizedMcpServer =
    transport === "stdio"
      ? { name, transport, command: "" }
      : { name, transport, url: "" };
  return editServer(template, env, platform);
}

export async function editMergedServers(
  merged: NormalizedConfig,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): Promise<{ updatedConfig: NormalizedConfig; manualEdits: ManualEdits }> {
  const manualEdits: ManualEdits = { created: new Set(), edited: new Set(), skipped: new Set() };
  const serverMap = new Map(merged.servers.map((s) => [s.name, s]));

  for (;;) {
    const addAction = uniqueAction("add", serverMap.keys());
    const finishAction = uniqueAction("done", [...serverMap.keys(), addAction]);
    const selected = await p.select<string>({
      message: "Manage MCP servers (select one to edit, or finish):",
      options: [
        ...[...serverMap.keys()].map((name) => ({ value: name, label: name })),
        { value: addAction, label: "Add a server" },
        { value: finishAction, label: "Finish editing" },
      ],
    });
    if (p.isCancel(selected) || selected === finishAction) break;

    if (selected === addAction) {
      const result = await addServer(serverMap, env, platform);
      if (result !== "skip") {
        manualEdits.created.add(result.name);
        serverMap.set(result.name, result);
      }
      continue;
    }

    const name = selected;
    const server = serverMap.get(name);
    if (!server) continue;

    const result = await editServer(server, env, platform);

    if (result === "skip") {
      p.log.info(`Skipped: ${name}`);
      if (manualEdits.created.delete(name)) {
        manualEdits.edited.delete(name);
      } else {
        manualEdits.skipped.add(name);
      }
      serverMap.delete(name);
    } else {
      manualEdits.edited.add(name);
      serverMap.set(name, result);
    }
  }

  const updatedServers = [...serverMap.values()];

  return { updatedConfig: { servers: updatedServers }, manualEdits };
}
