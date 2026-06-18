import type { NormalizedConfig } from "../model/types.js";
import type { DefaultPathCandidate, IdeAdapter, SaveResult } from "./types.js";
import { readTextFile, writeTextFile, parseJsonObject } from "./fileIO.js";
import { entryToNormalized, normalizedToEntry } from "./entryFields.js";
import { homeDir, joinForPlatform } from "./paths.js";

const IDE_ID = "claude-code";
const SERVERS_KEY = "mcpServers";

export const claudeCodeAdapter: IdeAdapter = {
  id: IDE_ID,
  label: "Claude Code",

  resolveDefaultPaths(env, platform, cwd): DefaultPathCandidate[] {
    const userConfigDir = env.CLAUDE_CONFIG_DIR ?? homeDir(env, platform);
    return [
      {
        scopeId: "user",
        label: "User (~/.claude.json)",
        path: joinForPlatform(platform, userConfigDir, ".claude.json"),
      },
      {
        scopeId: "project",
        label: "Project (.mcp.json)",
        path: joinForPlatform(platform, cwd, ".mcp.json"),
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
    // Surgical replace: this file (especially ~/.claude.json) may hold OAuth
    // session data and trust state unrelated to MCP — only mcpServers changes.
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
