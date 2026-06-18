import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { vscodeAdapter } from "./vscode.js";
import { withTmpDir } from "../test/tmp.js";

describe("vscodeAdapter.resolveDefaultPaths", () => {
  it("computes macOS user and workspace paths", () => {
    const paths = vscodeAdapter.resolveDefaultPaths({ HOME: "/Users/jane" }, "darwin", "/repo");
    expect(paths).toEqual([
      { scopeId: "workspace", label: "Workspace (.vscode/mcp.json)", path: "/repo/.vscode/mcp.json" },
      {
        scopeId: "user",
        label: "User",
        path: "/Users/jane/Library/Application Support/Code/User/mcp.json",
      },
    ]);
  });

  it("respects XDG_CONFIG_HOME on Linux", () => {
    const paths = vscodeAdapter.resolveDefaultPaths(
      { HOME: "/home/jane", XDG_CONFIG_HOME: "/home/jane/.xdgconfig" },
      "linux",
      "/repo",
    );
    expect(paths[1]).toEqual({
      scopeId: "user",
      label: "User",
      path: "/home/jane/.xdgconfig/Code/User/mcp.json",
    });
  });

  it("falls back to ~/.config on Linux without XDG_CONFIG_HOME", () => {
    const paths = vscodeAdapter.resolveDefaultPaths({ HOME: "/home/jane" }, "linux", "/repo");
    expect(paths[1]?.path).toBe("/home/jane/.config/Code/User/mcp.json");
  });

  it("computes a Windows AppData path", () => {
    const paths = vscodeAdapter.resolveDefaultPaths(
      { APPDATA: "C:\\Users\\jane\\AppData\\Roaming" },
      "win32",
      "C:\\repo",
    );
    expect(paths[1]?.path).toBe("C:\\Users\\jane\\AppData\\Roaming\\Code\\User\\mcp.json");
  });
});

describe("vscodeAdapter load/save", () => {
  it("treats a missing file as an empty config", async () => {
    await withTmpDir(async (dir) => {
      const config = await vscodeAdapter.load(join(dir, "mcp.json"));
      expect(config).toEqual({ servers: [] });
    });
  });

  it("round-trips a stdio entry and a remote entry", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await writeFile(
        path,
        JSON.stringify({
          servers: {
            local: { type: "stdio", command: "node", args: ["server.js"] },
            remote: { type: "sse", url: "https://example.com/mcp" },
          },
        }),
        "utf8",
      );

      const config = await vscodeAdapter.load(path);
      expect(config.servers).toHaveLength(2);
      expect(config.servers.find((s) => s.name === "local")).toMatchObject({
        transport: "stdio",
        command: "node",
        args: ["server.js"],
      });
      expect(config.servers.find((s) => s.name === "remote")).toMatchObject({
        transport: "sse",
        url: "https://example.com/mcp",
      });

      await vscodeAdapter.save(path, config);
      const reloaded = await vscodeAdapter.load(path);
      expect(reloaded).toEqual(config);
    });
  });

  it("always writes a mandatory type field", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await vscodeAdapter.save(path, {
        servers: [{ name: "local", transport: "stdio", command: "node" }],
      });
      const written = JSON.parse(await readFile(path, "utf8"));
      expect(written.servers.local.type).toBe("stdio");
    });
  });

  it("preserves comments in the original JSONC document", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await writeFile(
        path,
        ["{", "  // keep this comment", '  "servers": {}', "}"].join("\n"),
        "utf8",
      );

      await vscodeAdapter.save(path, {
        servers: [{ name: "local", transport: "stdio", command: "node" }],
      });

      const text = await readFile(path, "utf8");
      expect(text).toContain("// keep this comment");
    });
  });
});
