import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { claudeCodeAdapter } from "./claudeCode.js";
import { withTmpDir } from "../test/tmp.js";

describe("claudeCodeAdapter.resolveDefaultPaths", () => {
  it("defaults to ~/.claude.json when CLAUDE_CONFIG_DIR is unset", () => {
    const paths = claudeCodeAdapter.resolveDefaultPaths({ HOME: "/home/jane" }, "linux", "/repo");
    expect(paths).toEqual([
      { scopeId: "user", label: "User (~/.claude.json)", path: "/home/jane/.claude.json" },
      { scopeId: "project", label: "Project (.mcp.json)", path: "/repo/.mcp.json" },
    ]);
  });

  it("honors CLAUDE_CONFIG_DIR for the user scope", () => {
    const paths = claudeCodeAdapter.resolveDefaultPaths(
      { HOME: "/home/jane", CLAUDE_CONFIG_DIR: "/custom/dir" },
      "linux",
      "/repo",
    );
    expect(paths[0]?.path).toBe("/custom/dir/.claude.json");
  });
});

describe("claudeCodeAdapter load/save", () => {
  it("treats a missing file as an empty config", async () => {
    await withTmpDir(async (dir) => {
      const config = await claudeCodeAdapter.load(join(dir, ".claude.json"));
      expect(config).toEqual({ servers: [] });
    });
  });

  it("preserves unrelated top-level keys (OAuth/trust state) when writing", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, ".claude.json");
      await writeFile(
        path,
        JSON.stringify({
          oauthAccount: { token: "secret" },
          projects: { "/repo": { trusted: true } },
          mcpServers: { old: { command: "old" } },
        }),
        "utf8",
      );

      await claudeCodeAdapter.save(path, {
        servers: [{ name: "new", transport: "stdio", command: "node" }],
      });

      const written = JSON.parse(await readFile(path, "utf8"));
      expect(written.oauthAccount).toEqual({ token: "secret" });
      expect(written.projects).toEqual({ "/repo": { trusted: true } });
      expect(written.mcpServers).toEqual({ new: { command: "node" } });
    });
  });

  it("round-trips a stdio entry without a type field", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, ".mcp.json");
      const config = {
        servers: [{ name: "local", transport: "stdio" as const, command: "node", args: ["x.js"] }],
      };
      await claudeCodeAdapter.save(path, config);
      const written = JSON.parse(await readFile(path, "utf8"));
      expect(written.mcpServers.local.type).toBeUndefined();
      expect(await claudeCodeAdapter.load(path)).toEqual(config);
    });
  });
});
