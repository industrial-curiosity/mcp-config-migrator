import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { piAdapter } from "./pi.js";
import { withTmpDir } from "../test/tmp.js";

describe("piAdapter.resolveDefaultPaths", () => {
  it("returns all four scopes with hints on macOS/Linux", () => {
    const paths = piAdapter.resolveDefaultPaths({ HOME: "/home/jane" }, "linux", "/repo");
    expect(paths).toEqual([
      {
        scopeId: "global-shared",
        label: "Global shared",
        path: "/home/jane/.config/mcp/mcp.json",
        hint: "shared across all MCP tools",
      },
      {
        scopeId: "global",
        label: "Pi global override",
        path: "/home/jane/.pi/agent/mcp.json",
        hint: "Pi-specific; overrides global shared",
      },
      {
        scopeId: "project-shared",
        label: "Project shared",
        path: "/repo/.mcp.json",
        hint: "shared across all MCP tools in this project",
      },
      {
        scopeId: "project",
        label: "Pi project override",
        path: "/repo/.pi/mcp.json",
        hint: "Pi-specific; overrides project shared",
      },
    ]);
  });

  it("every candidate has a non-empty hint", () => {
    const paths = piAdapter.resolveDefaultPaths({ HOME: "/home/jane" }, "linux", "/repo");
    for (const candidate of paths) {
      expect(candidate.hint).toBeTruthy();
    }
  });

  it("computes Windows paths from USERPROFILE", () => {
    const paths = piAdapter.resolveDefaultPaths(
      { USERPROFILE: "C:\\Users\\jane" },
      "win32",
      "C:\\repo",
    );
    expect(paths[0]?.path).toBe("C:\\Users\\jane\\.config\\mcp\\mcp.json");
    expect(paths[1]?.path).toBe("C:\\Users\\jane\\.pi\\agent\\mcp.json");
    expect(paths[2]?.path).toBe("C:\\repo\\.mcp.json");
    expect(paths[3]?.path).toBe("C:\\repo\\.pi\\mcp.json");
  });
});

describe("piAdapter load/save", () => {
  it("treats a missing file as an empty config", async () => {
    await withTmpDir(async (dir) => {
      const config = await piAdapter.load(join(dir, "mcp.json"));
      expect(config).toEqual({ servers: [] });
    });
  });

  it("loads a stdio entry and defaults typeless entries to stdio", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await writeFile(
        path,
        JSON.stringify({ mcpServers: { local: { command: "node", args: ["server.js"] } } }),
        "utf8",
      );
      const config = await piAdapter.load(path);
      expect(config.servers[0]).toMatchObject({
        name: "local",
        transport: "stdio",
        command: "node",
        args: ["server.js"],
      });
    });
  });

  it("loads a remote entry with url and headers", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await writeFile(
        path,
        JSON.stringify({
          mcpServers: {
            remote: {
              type: "http",
              url: "https://api.example.com/mcp",
              headers: { Authorization: "Bearer token" },
            },
          },
        }),
        "utf8",
      );
      const config = await piAdapter.load(path);
      expect(config.servers[0]).toMatchObject({
        name: "remote",
        transport: "http",
        url: "https://api.example.com/mcp",
        headers: { Authorization: "Bearer token" },
      });
    });
  });

  it("preserves directTools through a round-trip save", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await writeFile(
        path,
        JSON.stringify({
          mcpServers: {
            myserver: { command: "npx", args: ["-y", "some-server"], directTools: ["tool_a", "tool_b"] },
          },
        }),
        "utf8",
      );
      const config = await piAdapter.load(path);
      await piAdapter.save(path, config);
      const written = JSON.parse(await readFile(path, "utf8"));
      expect(written.mcpServers.myserver.directTools).toEqual(["tool_a", "tool_b"]);
    });
  });
});
