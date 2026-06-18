import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cursorAdapter } from "./cursor.js";
import { withTmpDir } from "../test/tmp.js";

describe("cursorAdapter.resolveDefaultPaths", () => {
  it("computes global and project paths on macOS/Linux", () => {
    const paths = cursorAdapter.resolveDefaultPaths({ HOME: "/home/jane" }, "linux", "/repo");
    expect(paths).toEqual([
      { scopeId: "global", label: "Global", path: "/home/jane/.cursor/mcp.json" },
      { scopeId: "project", label: "Project (.cursor/mcp.json)", path: "/repo/.cursor/mcp.json" },
    ]);
  });

  it("computes a Windows global path from USERPROFILE", () => {
    const paths = cursorAdapter.resolveDefaultPaths(
      { USERPROFILE: "C:\\Users\\jane" },
      "win32",
      "C:\\repo",
    );
    expect(paths[0]?.path).toBe("C:\\Users\\jane\\.cursor\\mcp.json");
  });
});

describe("cursorAdapter load/save", () => {
  it("treats a missing file as an empty config", async () => {
    await withTmpDir(async (dir) => {
      const config = await cursorAdapter.load(join(dir, "mcp.json"));
      expect(config).toEqual({ servers: [] });
    });
  });

  it("defaults a typeless entry to stdio", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await writeFile(path, JSON.stringify({ mcpServers: { local: { command: "node" } } }), "utf8");
      const config = await cursorAdapter.load(path);
      expect(config.servers[0]).toMatchObject({ name: "local", transport: "stdio", command: "node" });
    });
  });

  it("omits type for stdio entries when saving", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await cursorAdapter.save(path, {
        servers: [{ name: "local", transport: "stdio", command: "node" }],
      });
      const written = JSON.parse(await readFile(path, "utf8"));
      expect(written.mcpServers.local).toEqual({ command: "node" });
    });
  });

  it("round-trips a remote entry with headers", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      const config = {
        servers: [
          {
            name: "remote",
            transport: "http" as const,
            url: "https://example.com/mcp",
            headers: { Authorization: "Bearer x" },
          },
        ],
      };
      await cursorAdapter.save(path, config);
      expect(await cursorAdapter.load(path)).toEqual(config);
    });
  });

  it("preserves unrelated top-level keys when saving", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await writeFile(path, JSON.stringify({ someOtherSetting: true, mcpServers: {} }), "utf8");
      await cursorAdapter.save(path, {
        servers: [{ name: "local", transport: "stdio", command: "node" }],
      });
      const written = JSON.parse(await readFile(path, "utf8"));
      expect(written.someOtherSetting).toBe(true);
    });
  });
});
