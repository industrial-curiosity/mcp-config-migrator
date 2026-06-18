import type { NormalizedMcpServer, Transport } from "../model/types.js";

const STDIO_FIELDS = ["type", "command", "args", "cwd", "env"];
const REMOTE_FIELDS = ["type", "url", "headers"];

/** Parses one raw server-map entry into the normalized shape, stashing unrecognized fields in `extra`. */
export function entryToNormalized(
  name: string,
  raw: Record<string, unknown>,
  ideId: string,
  defaultTransport: Transport = "stdio",
): NormalizedMcpServer {
  const transport = (raw.type as Transport | undefined) ?? defaultTransport;
  const knownKeys = transport === "stdio" ? STDIO_FIELDS : REMOTE_FIELDS;
  const extraFields: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (!knownKeys.includes(key)) extraFields[key] = raw[key];
  }

  const server: NormalizedMcpServer = { name, transport };
  if (transport === "stdio") {
    if (typeof raw.command === "string") server.command = raw.command;
    if (Array.isArray(raw.args)) server.args = raw.args as string[];
    if (typeof raw.cwd === "string") server.cwd = raw.cwd;
    if (raw.env && typeof raw.env === "object") server.env = raw.env as Record<string, string>;
  } else {
    if (typeof raw.url === "string") server.url = raw.url;
    if (raw.headers && typeof raw.headers === "object") {
      server.headers = raw.headers as Record<string, string>;
    }
  }
  if (Object.keys(extraFields).length > 0) {
    server.extra = { sourceIdeId: ideId, fields: extraFields };
  }
  return server;
}

export interface SerializedEntry {
  entry: Record<string, unknown>;
  droppedFields: string[];
}

/**
 * Builds a raw server-map entry from the normalized shape.
 * `includeType` controls whether `type` is emitted for stdio entries
 * (VS Code requires it; Cursor/Claude Code make it optional for stdio).
 * Remote (http/sse) entries always include `type`.
 */
export function normalizedToEntry(
  server: NormalizedMcpServer,
  ideId: string,
  includeType: boolean,
): SerializedEntry {
  const entry: Record<string, unknown> = {};
  if (includeType || server.transport !== "stdio") {
    entry.type = server.transport;
  }
  if (server.transport === "stdio") {
    if (server.command !== undefined) entry.command = server.command;
    if (server.args !== undefined) entry.args = server.args;
    if (server.cwd !== undefined) entry.cwd = server.cwd;
    if (server.env !== undefined) entry.env = server.env;
  } else {
    if (server.url !== undefined) entry.url = server.url;
    if (server.headers !== undefined) entry.headers = server.headers;
  }

  let droppedFields: string[] = [];
  if (server.extra) {
    if (server.extra.sourceIdeId === ideId) {
      Object.assign(entry, server.extra.fields);
    } else {
      droppedFields = Object.keys(server.extra.fields);
    }
  }
  return { entry, droppedFields };
}
