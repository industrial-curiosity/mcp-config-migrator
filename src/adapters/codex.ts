import { parse, stringify } from "@iarna/toml";
import type { NormalizedConfig, NormalizedMcpServer } from "../model/types.js";
import type { DefaultPathCandidate, IdeAdapter, SaveResult } from "./types.js";
import { readTextFile, writeTextFile } from "./fileIO.js";
import { homeDir, joinForPlatform } from "./paths.js";

const IDE_ID = "codex";
const MCP_SERVERS_KEY = "mcp_servers";
const STDIO_FIELDS = new Set(["command", "args", "cwd", "env"]);
const HTTP_FIELDS = new Set(["url", "http_headers"]);

type TomlValue = boolean | number | string | Date | TomlValue[] | TomlTable;
interface TomlTable {
  [key: string]: TomlValue;
}

interface TableHeader {
  start: number;
  segments: string[];
}

function isTomlTable(value: TomlValue | undefined): value is TomlTable {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function stringRecord(value: TomlValue | undefined): Record<string, string> | undefined {
  if (!isTomlTable(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.some(([, entry]) => typeof entry !== "string")) return undefined;
  return Object.fromEntries(entries) as Record<string, string>;
}

function tableSegments(header: string): string[] | undefined {
  const segments: string[] = [];
  let offset = 0;
  while (offset < header.length) {
    const rest = header.slice(offset);
    const quoted = /^("(?:\\.|[^"\\])*")/.exec(rest);
    const bare = /^([A-Za-z0-9_-]+)/.exec(rest);
    const match = quoted ?? bare;
    if (!match) return undefined;
    try {
      segments.push(quoted ? JSON.parse(match[1]!) : match[1]!);
    } catch {
      return undefined;
    }
    offset += match[0].length;
    if (offset === header.length) return segments;
    if (header[offset] !== ".") return undefined;
    offset += 1;
  }
  return segments;
}

function findTableHeaders(text: string): TableHeader[] {
  const headers: TableHeader[] = [];
  const pattern = /^[ \t]*\[([^\]]+)\][ \t]*(?:#.*)?$/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const segments = tableSegments(match[1]!);
    if (segments) headers.push({ start: match.index, segments });
  }
  return headers;
}

function isServerTable(segments: string[]): boolean {
  return segments[0] === MCP_SERVERS_KEY && segments.length >= 2;
}

function serverTableRanges(text: string): Array<{ start: number; end: number }> {
  const headers = findTableHeaders(text);
  const ranges: Array<{ start: number; end: number }> = [];
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index]!;
    if (!isServerTable(header.segments) || header.segments.length !== 2) continue;
    let end = text.length;
    for (let nextIndex = index + 1; nextIndex < headers.length; nextIndex += 1) {
      const next = headers[nextIndex]!;
      if (!isServerTable(next.segments) || next.segments[1] !== header.segments[1]) {
        end = next.start;
        break;
      }
    }
    ranges.push({ start: header.start, end });
  }
  return ranges;
}

function serializeServers(servers: NormalizedMcpServer[]): {
  text: string;
  droppedFields: SaveResult["droppedFields"];
} {
  const values: TomlTable = {};
  const droppedFields: SaveResult["droppedFields"] = [];
  for (const server of servers) {
    if (server.transport === "sse") {
      droppedFields.push({ serverName: server.name, fields: ["transport (sse)"] });
      continue;
    }

    const entry: TomlTable = {};
    if (server.transport === "stdio") {
      if (server.command !== undefined) entry.command = server.command;
      if (server.args !== undefined) entry.args = server.args;
      if (server.cwd !== undefined) entry.cwd = server.cwd;
      if (server.env !== undefined) entry.env = server.env;
    } else {
      if (server.url !== undefined) entry.url = server.url;
      if (server.headers !== undefined) entry.http_headers = server.headers;
    }

    if (server.extra) {
      if (server.extra.sourceIdeId === IDE_ID) {
        Object.assign(entry, server.extra.fields);
      } else {
        droppedFields.push({ serverName: server.name, fields: Object.keys(server.extra.fields) });
      }
    }
    values[server.name] = entry;
  }

  const serialized = stringify(values as Parameters<typeof stringify>[0]);
  const text = serialized.replace(/^([ \t]*)\[([^\]]+)\]/gm, `$1[${MCP_SERVERS_KEY}.$2]`);
  return { text, droppedFields };
}

function replaceServerTables(original: string, serversText: string): string {
  const ranges = serverTableRanges(original);
  if (ranges.length === 0) {
    if (serversText === "") return original;
    const separator = original === "" || original.endsWith("\n\n") ? "" : original.endsWith("\n") ? "\n" : "\n\n";
    return `${original}${separator}${serversText}`;
  }

  const first = ranges[0]!;
  const last = ranges[ranges.length - 1]!;
  return `${original.slice(0, first.start)}${serversText}${original.slice(last.end)}`;
}

function entryToNormalized(name: string, entry: TomlTable): NormalizedMcpServer {
  const isHttp = typeof entry.url === "string";
  const knownFields = isHttp ? HTTP_FIELDS : STDIO_FIELDS;
  const extraFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entry)) {
    if (!knownFields.has(key)) extraFields[key] = value;
  }

  const server: NormalizedMcpServer = { name, transport: isHttp ? "http" : "stdio" };
  if (isHttp) {
    server.url = entry.url as string;
    server.headers = stringRecord(entry.http_headers);
  } else {
    if (typeof entry.command === "string") server.command = entry.command;
    if (Array.isArray(entry.args) && entry.args.every((argument) => typeof argument === "string")) {
      server.args = entry.args as string[];
    }
    if (typeof entry.cwd === "string") server.cwd = entry.cwd;
    server.env = stringRecord(entry.env);
  }
  if (Object.keys(extraFields).length > 0) {
    server.extra = { sourceIdeId: IDE_ID, fields: extraFields };
  }
  return server;
}

export const codexAdapter: IdeAdapter = {
  id: IDE_ID,
  label: "Codex",

  resolveDefaultPaths(env, platform, cwd): DefaultPathCandidate[] {
    const home = homeDir(env, platform);
    return [
      {
        scopeId: "user",
        label: "User (~/.codex/config.toml)",
        path: joinForPlatform(platform, home, ".codex", "config.toml"),
      },
      {
        scopeId: "project",
        label: "Project (.codex/config.toml)",
        path: joinForPlatform(platform, cwd, ".codex", "config.toml"),
      },
    ];
  },

  async load(path): Promise<NormalizedConfig> {
    const text = await readTextFile(path);
    if (text.trim() === "") return { servers: [] };
    const document = parse(text) as unknown as TomlTable;
    const servers = isTomlTable(document[MCP_SERVERS_KEY])
      ? Object.entries(document[MCP_SERVERS_KEY]).flatMap(([name, entry]) =>
          isTomlTable(entry) ? [entryToNormalized(name, entry)] : [],
        )
      : [];
    return { servers };
  },

  async save(path, normalized): Promise<SaveResult> {
    const original = await readTextFile(path);
    const { text, droppedFields } = serializeServers(normalized.servers);
    await writeTextFile(path, replaceServerTables(original, text));
    return { droppedFields };
  },
};
