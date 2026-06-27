import type { NormalizedConfig } from "../model/types.js";
import type { DefaultPathCandidate, IdeAdapter, SaveResult } from "./types.js";
import { readTextFile, writeTextFile, parseJsonObject } from "./fileIO.js";
import { entryToNormalized, normalizedToEntry } from "./entryFields.js";
import { homeDir, joinForPlatform } from "./paths.js";

const IDE_ID = "pi";
const SERVERS_KEY = "mcpServers";

export const piAdapter: IdeAdapter = {
  id: IDE_ID,
  label: "Pi",

  resolveDefaultPaths(env, platform, cwd): DefaultPathCandidate[] {
    const home = homeDir(env, platform);
    return [
      {
        scopeId: "global-shared",
        label: "Global shared",
        path: joinForPlatform(platform, home, ".config", "mcp", "mcp.json"),
        hint: "shared across all MCP tools",
      },
      {
        scopeId: "global",
        label: "Pi global override",
        path: joinForPlatform(platform, home, ".pi", "agent", "mcp.json"),
        hint: "Pi-specific; overrides global shared",
      },
      {
        scopeId: "project-shared",
        label: "Project shared",
        path: joinForPlatform(platform, cwd, ".mcp.json"),
        hint: "shared across all MCP tools in this project",
      },
      {
        scopeId: "project",
        label: "Pi project override",
        path: joinForPlatform(platform, cwd, ".pi", "mcp.json"),
        hint: "Pi-specific; overrides project shared",
      },
    ];
  },

  async load(path): Promise<NormalizedConfig> {
    const text = await readTextFile(path);
    const doc = parseJsonObject(text);
    const serversRaw = (doc[SERVERS_KEY] ?? {}) as Record<string, unknown>;
    const servers = Object.entries(serversRaw).map(([name, raw]) =>
      entryToNormalized(name, raw as Record<string, unknown>, IDE_ID, "stdio"),
    );
    return { servers };
  },

  async save(path, normalized): Promise<SaveResult> {
    const text = await readTextFile(path);
    const doc = parseJsonObject(text);
    const serversValue: Record<string, unknown> = {};
    const droppedFields: SaveResult["droppedFields"] = [];

    for (const server of normalized.servers) {
      const { entry, droppedFields: dropped } = normalizedToEntry(server, IDE_ID, false);
      serversValue[server.name] = entry;
      if (dropped.length > 0) {
        droppedFields.push({ serverName: server.name, fields: dropped });
      }
    }

    doc[SERVERS_KEY] = serversValue;
    await writeTextFile(path, `${JSON.stringify(doc, null, 2)}\n`);

    return { droppedFields };
  },
};
