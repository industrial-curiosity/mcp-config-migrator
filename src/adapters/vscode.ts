import { parse as parseJsonc, modify, applyEdits, type FormattingOptions } from "jsonc-parser";
import type { NormalizedConfig } from "../model/types.js";
import type { DefaultPathCandidate, IdeAdapter, SaveResult } from "./types.js";
import { readTextFile, writeTextFile } from "./fileIO.js";
import { entryToNormalized, normalizedToEntry } from "./entryFields.js";
import { homeDir, joinForPlatform } from "./paths.js";

const IDE_ID = "vscode";
const SERVERS_KEY = "servers";

function userConfigDir(env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string {
  const home = homeDir(env, platform);
  if (platform === "darwin") {
    return joinForPlatform(platform, home, "Library", "Application Support", "Code", "User");
  }
  if (platform === "win32") {
    return joinForPlatform(
      platform,
      env.APPDATA ?? joinForPlatform(platform, home, "AppData", "Roaming"),
      "Code",
      "User",
    );
  }
  return joinForPlatform(platform, env.XDG_CONFIG_HOME ?? joinForPlatform(platform, home, ".config"), "Code", "User");
}

export const vscodeAdapter: IdeAdapter = {
  id: IDE_ID,
  label: "VS Code",

  resolveDefaultPaths(env, platform, cwd): DefaultPathCandidate[] {
    return [
      {
        scopeId: "workspace",
        label: "Workspace (.vscode/mcp.json)",
        path: joinForPlatform(platform, cwd, ".vscode", "mcp.json"),
      },
      {
        scopeId: "user",
        label: "User",
        path: joinForPlatform(platform, userConfigDir(env, platform), "mcp.json"),
      },
    ];
  },

  async load(path): Promise<NormalizedConfig> {
    const text = await readTextFile(path);
    const doc = text.trim() === "" ? {} : (parseJsonc(text) as Record<string, unknown>);
    const serversRaw = (doc[SERVERS_KEY] ?? {}) as Record<string, unknown>;
    const servers = Object.entries(serversRaw).map(([name, raw]) =>
      entryToNormalized(name, raw as Record<string, unknown>, IDE_ID, "stdio"),
    );
    return { servers };
  },

  async save(path, normalized): Promise<SaveResult> {
    const originalText = await readTextFile(path);
    const serversValue: Record<string, unknown> = {};
    const droppedFields: SaveResult["droppedFields"] = [];

    for (const server of normalized.servers) {
      const { entry, droppedFields: dropped } = normalizedToEntry(server, IDE_ID, true);
      serversValue[server.name] = entry;
      if (dropped.length > 0) {
        droppedFields.push({ serverName: server.name, fields: dropped });
      }
    }

    const formattingOptions: FormattingOptions = { tabSize: 2, insertSpaces: true, eol: "\n" };
    const edits = modify(originalText, [SERVERS_KEY], serversValue, { formattingOptions });
    const newText = applyEdits(originalText, edits);
    await writeTextFile(path, newText);

    return { droppedFields };
  },
};
