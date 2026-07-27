import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { codexAdapter } from "./codex.js";
import { withTmpDir } from "../test/tmp.js";

describe("codexAdapter.resolveDefaultPaths", () => {
  it("computes user and project config paths", () => {
    const paths = codexAdapter.resolveDefaultPaths({ HOME: "/home/jane" }, "linux", "/repo");
    expect(paths).toEqual([
      { scopeId: "user", label: "User (~/.codex/config.toml)", path: "/home/jane/.codex/config.toml" },
      { scopeId: "project", label: "Project (.codex/config.toml)", path: "/repo/.codex/config.toml" },
    ]);
  });

  it("computes Windows config paths", () => {
    const paths = codexAdapter.resolveDefaultPaths({ USERPROFILE: "C:\\Users\\jane" }, "win32", "C:\\repo");
    expect(paths[0]?.path).toBe("C:\\Users\\jane\\.codex\\config.toml");
    expect(paths[1]?.path).toBe("C:\\repo\\.codex\\config.toml");
  });
});

describe("codexAdapter load/save", () => {
  it("treats a missing file as an empty config", async () => {
    await withTmpDir(async (dir) => {
      await expect(codexAdapter.load(join(dir, "config.toml"))).resolves.toEqual({ servers: [] });
    });
  });

  it("parses and round-trips a stdio server with Codex-specific fields", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "config.toml");
      await writeFile(
        path,
        [
          '[mcp_servers.local]',
          'command = "node"',
          'args = ["server.js"]',
          'cwd = "/repo"',
          'env = { API_KEY = "example" }',
          'enabled_tools = ["read"]',
          '',
          '[mcp_servers.local.tools.write]',
          'approval_mode = "prompt"',
          '',
        ].join("\n"),
        "utf8",
      );

      const config = await codexAdapter.load(path);
      expect(config.servers).toEqual([
        {
          name: "local",
          transport: "stdio",
          command: "node",
          args: ["server.js"],
          cwd: "/repo",
          env: { API_KEY: "example" },
          extra: {
            sourceIdeId: "codex",
            fields: { enabled_tools: ["read"], tools: { write: { approval_mode: "prompt" } } },
          },
        },
      ]);

      await codexAdapter.save(path, config);
      await expect(codexAdapter.load(path)).resolves.toEqual(config);
    });
  });

  it("parses and serializes a streamable HTTP server", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "config.toml");
      await writeFile(
        path,
        ['[mcp_servers.remote]', 'url = "https://example.com/mcp"', 'http_headers = { Authorization = "Bearer token" }', ''].join("\n"),
        "utf8",
      );

      const config = await codexAdapter.load(path);
      expect(config.servers).toEqual([
        {
          name: "remote",
          transport: "http",
          url: "https://example.com/mcp",
          headers: { Authorization: "Bearer token" },
        },
      ]);

      await codexAdapter.save(path, config);
      await expect(codexAdapter.load(path)).resolves.toEqual(config);
    });
  });

  it("preserves unrelated TOML comments and tables when replacing servers", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "config.toml");
      const unrelated = ['# retain this comment', 'model = "gpt-5"', '', '[sandbox_workspace_write]', 'network_access = true', ''].join("\n");
      await writeFile(
        path,
        `${unrelated}[mcp_servers.old]\ncommand = "old"\n\n[mcp_servers.old.tools.read]\napproval_mode = "prompt"\n\n[profiles.fast]\nmodel = "gpt-5-mini"\n`,
        "utf8",
      );

      await codexAdapter.save(path, {
        servers: [{ name: "new", transport: "stdio", command: "node", args: ["server.js"] }],
      });

      const written = await readFile(path, "utf8");
      expect(written).toContain(unrelated);
      expect(written).toContain('[profiles.fast]\nmodel = "gpt-5-mini"');
      expect(written).not.toContain("mcp_servers.old");
      await expect(codexAdapter.load(path)).resolves.toEqual({
        servers: [{ name: "new", transport: "stdio", command: "node", args: ["server.js"] }],
      });
    });
  });

  it("removes server tables without changing unrelated configuration", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "config.toml");
      await writeFile(path, 'model = "gpt-5"\n\n[mcp_servers.local]\ncommand = "node"\n', "utf8");

      await codexAdapter.save(path, { servers: [] });

      await expect(readFile(path, "utf8")).resolves.toBe('model = "gpt-5"\n\n');
    });
  });

  it("skips unsupported SSE servers and reports them as dropped", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "config.toml");

      const result = await codexAdapter.save(path, {
        servers: [{ name: "legacy", transport: "sse", url: "https://example.com/sse" }],
      });

      expect(result.droppedFields).toEqual([{ serverName: "legacy", fields: ["transport (sse)"] }]);
      await expect(codexAdapter.load(path)).resolves.toEqual({ servers: [] });
    });
  });
});
