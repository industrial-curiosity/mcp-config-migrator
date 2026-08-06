import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { withTmpDir } from "../test/tmp.js";
import { codexAdapter } from "../adapters/codex.js";
import { setPreference } from "../model/versionsStore.js";

const { CANCEL } = vi.hoisted(() => ({ CANCEL: Symbol("cancel") }));

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  note: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn(), step: vi.fn(), message: vi.fn() },
  isCancel: (value: unknown) => value === CANCEL,
  select: vi.fn(),
  text: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("./editor.js", () => ({ editText: vi.fn() }));

import * as p from "@clack/prompts";
import { editText } from "./editor.js";
import { runCli } from "./flow.js";

const select = p.select as unknown as Mock;
const text = p.text as unknown as Mock;
const confirm = p.confirm as unknown as Mock;
const note = p.note as unknown as Mock;
const outro = p.outro as unknown as Mock;
const cancelFn = p.cancel as unknown as Mock;
const editTextMock = editText as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  select.mockReset();
});

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8"));
}

/** Settings file pre-set to skip the backup decision prompt, for tests not focused on backup behavior. */
async function settingsPathWithBackupOff(dir: string): Promise<string> {
  const settingsPath = join(dir, "settings.json");
  await setPreference(settingsPath, "alwaysOff");
  return settingsPath;
}

describe("runCli", () => {
  it("adds a server during migration even when there is nothing to import", async () => {
    await withTmpDir(async (dir) => {
      const sourcePath = join(dir, "source-mcp.json");
      const targetPath = join(dir, "target-mcp.json");
      await writeFile(sourcePath, JSON.stringify({ mcpServers: {} }), "utf8");
      await writeFile(targetPath, JSON.stringify({ mcpServers: {} }), "utf8");

      select
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("global")
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("project")
        .mockResolvedValueOnce("add")
        .mockResolvedValueOnce("stdio")
        .mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath).mockResolvedValueOnce("gamma");
      editTextMock.mockResolvedValueOnce('{"transport":"stdio","command":"node"}');
      confirm.mockResolvedValueOnce(true);

      await runCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPathWithBackupOff(dir) });

      expect(await readJson(targetPath)).toEqual({ mcpServers: { gamma: { command: "node" } } });
      expect(note).toHaveBeenCalledWith(expect.stringContaining("Added (1): gamma"), "Migration summary");
    });
  });

  it("migrates additions from Cursor to a new Codex project config", async () => {
    await withTmpDir(async (dir) => {
      const sourcePath = join(dir, "source-mcp.json");
      const targetPath = join(dir, ".codex", "config.toml");
      await writeFile(sourcePath, JSON.stringify({ mcpServers: { alpha: { command: "node", args: ["alpha.js"] } } }), "utf8");

      select
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("global")
        .mockResolvedValueOnce("codex")
        .mockResolvedValueOnce("project")
        .mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      confirm.mockResolvedValueOnce(true);

      await runCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPathWithBackupOff(dir) });

      await expect(codexAdapter.load(targetPath)).resolves.toEqual({
        servers: [{ name: "alpha", transport: "stdio", command: "node", args: ["alpha.js"] }],
      });
    });
  });

  it("removes a server from a Codex target during pre-summary management", async () => {
    await withTmpDir(async (dir) => {
      const sourcePath = join(dir, "source-mcp.json");
      const targetPath = join(dir, ".codex", "config.toml");
      await writeFile(sourcePath, JSON.stringify({ mcpServers: { alpha: { command: "node" } } }), "utf8");

      select
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("global")
        .mockResolvedValueOnce("codex")
        .mockResolvedValueOnce("project")
        .mockResolvedValueOnce("alpha")
        .mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      confirm.mockResolvedValueOnce(true);
      editTextMock.mockResolvedValueOnce("");

      await runCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPathWithBackupOff(dir) });

      await expect(codexAdapter.load(targetPath)).resolves.toEqual({ servers: [] });
    });
  });

  it("migrates additions from Cursor to a non-existent VS Code target", async () => {
    await withTmpDir(async (dir) => {
      const sourcePath = join(dir, "source-mcp.json");
      const targetPath = join(dir, "target-mcp.json");
      await writeFile(
        sourcePath,
        JSON.stringify({ mcpServers: { alpha: { command: "node", args: ["alpha.js"] } } }),
        "utf8",
      );

      select
        .mockResolvedValueOnce("cursor") // source ide
        .mockResolvedValueOnce("global") // source scope
        .mockResolvedValueOnce("vscode") // target ide
        .mockResolvedValueOnce("user") // target scope
        .mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      confirm.mockResolvedValueOnce(true);

      await runCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPathWithBackupOff(dir) });

      const written = await readJson(targetPath);
      expect(written.servers).toEqual({
        alpha: { type: "stdio", command: "node", args: ["alpha.js"] },
      });
      expect(note).not.toHaveBeenCalledWith(expect.stringContaining("reset-project-choices"), expect.anything());
    });
  });

  it("resolves each conflict per the user's choice", async () => {
    await withTmpDir(async (dir) => {
      const sourcePath = join(dir, "source-mcp.json");
      const targetPath = join(dir, "target-mcp.json");
      await writeFile(
        sourcePath,
        JSON.stringify({
          mcpServers: {
            add1: { command: "source-add" },
            same1: { command: "shared" },
            keep1: { command: "source-keep" },
            take1: { command: "source-take" },
          },
        }),
        "utf8",
      );
      await writeFile(
        targetPath,
        JSON.stringify({
          mcpServers: {
            same1: { command: "shared" },
            keep1: { command: "target-keep" },
            take1: { command: "target-take" },
            onlyInTarget: { command: "target-only" },
          },
        }),
        "utf8",
      );

      select
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("global")
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("project")
        // conflicts, in source-entry order: keep1, take1
        .mockResolvedValueOnce("accept-target")
        .mockResolvedValueOnce("accept-source")
        .mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      confirm.mockResolvedValueOnce(true);

      await runCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPathWithBackupOff(dir) });

      const written = await readJson(targetPath);
      expect(written.mcpServers).toEqual({
        add1: { command: "source-add" },
        same1: { command: "shared" },
        keep1: { command: "target-keep" },
        take1: { command: "source-take" },
        onlyInTarget: { command: "target-only" },
      });
      expect(note).toHaveBeenCalledWith(expect.stringContaining("Added (1): add1"), "Migration summary");
      expect(note).toHaveBeenCalledWith(expect.stringContaining("accept target (1): keep1"), "Migration summary");
      expect(note).toHaveBeenCalledWith(expect.stringContaining("accept source (1): take1"), "Migration summary");
    });
  });

  it("resolves a conflict via the merge editor and writes the hand-merged entry", async () => {
    await withTmpDir(async (dir) => {
      const sourcePath = join(dir, "source-mcp.json");
      const targetPath = join(dir, "target-mcp.json");
      await writeFile(
        sourcePath,
        JSON.stringify({ mcpServers: { merge1: { command: "source-cmd" } } }),
        "utf8",
      );
      await writeFile(
        targetPath,
        JSON.stringify({ mcpServers: { merge1: { command: "target-cmd" } } }),
        "utf8",
      );

      select
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("global")
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("project")
        .mockResolvedValueOnce("merge") // resolution choice for merge1
        .mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      editTextMock.mockResolvedValueOnce('{\n  "transport": "stdio",\n  "command": "hand-merged"\n}\n');
      confirm.mockResolvedValueOnce(true);

      await runCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPathWithBackupOff(dir) });

      const written = await readJson(targetPath);
      expect(written.mcpServers).toEqual({ merge1: { command: "hand-merged" } });
      expect(note).toHaveBeenCalledWith(expect.stringContaining("merged (1): merge1"), "Migration summary");
      // Only the conflict merge editor call; pre-summary edit selected nothing.
      expect(editTextMock).toHaveBeenCalledTimes(1);
    });
  });

  it("exits without writing or backing up when the user cancels", async () => {
    await withTmpDir(async (dir) => {
      select.mockResolvedValueOnce(CANCEL);

      await runCli({ cwd: dir, env: {}, platform: "linux" });

      expect(cancelFn).toHaveBeenCalled();
      expect(await readdir(dir)).toEqual([]);
    });
  });

  it("reports nothing to migrate and skips write/confirm/cleanup when source is a subset of target", async () => {
    await withTmpDir(async (dir) => {
      const sourcePath = join(dir, "source-mcp.json");
      const targetPath = join(dir, "target-mcp.json");
      const content = JSON.stringify({ mcpServers: { same1: { command: "shared" } } });
      await writeFile(sourcePath, content, "utf8");
      await writeFile(targetPath, content, "utf8");

      select
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("global")
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("project")
        .mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);

      await runCli({ cwd: dir, env: {}, platform: "linux" });

      expect(outro).toHaveBeenCalledWith(expect.stringContaining("Nothing to migrate"));
      expect(confirm).not.toHaveBeenCalled();
      expect(await readJson(targetPath)).toEqual(JSON.parse(content));
    });
  });


  it("shows the Claude Code re-approval notice when project-scope entries change", async () => {
    await withTmpDir(async (dir) => {
      const sourcePath = join(dir, "source-mcp.json");
      const targetPath = join(dir, "target-mcp.json");
      await writeFile(
        sourcePath,
        JSON.stringify({ mcpServers: { alpha: { command: "node" } } }),
        "utf8",
      );

      select
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("global")
        .mockResolvedValueOnce("claude-code")
        .mockResolvedValueOnce("project")
        .mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      confirm.mockResolvedValueOnce(true);

      await runCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPathWithBackupOff(dir) });

      expect(note).toHaveBeenCalledWith(expect.stringContaining("reset-project-choices"), expect.anything());
      expect(note).toHaveBeenCalledWith(expect.stringContaining("alpha"), expect.anything());
    });
  });

  it("does not show the re-approval notice for Claude Code user scope", async () => {
    await withTmpDir(async (dir) => {
      const sourcePath = join(dir, "source-mcp.json");
      const targetPath = join(dir, "target-mcp.json");
      await writeFile(
        sourcePath,
        JSON.stringify({ mcpServers: { alpha: { command: "node" } } }),
        "utf8",
      );

      select
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("global")
        .mockResolvedValueOnce("claude-code")
        .mockResolvedValueOnce("user")
        .mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      confirm.mockResolvedValueOnce(true);

      await runCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPathWithBackupOff(dir) });

      expect(note).not.toHaveBeenCalledWith(expect.stringContaining("reset-project-choices"), expect.anything());
    });
  });
});
