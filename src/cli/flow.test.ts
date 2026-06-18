import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { withTmpDir } from "../test/tmp.js";

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
  multiselect: vi.fn(),
}));

import * as p from "@clack/prompts";
import { runCli } from "./flow.js";

const select = p.select as unknown as Mock;
const text = p.text as unknown as Mock;
const confirm = p.confirm as unknown as Mock;
const multiselect = p.multiselect as unknown as Mock;
const note = p.note as unknown as Mock;
const outro = p.outro as unknown as Mock;
const cancelFn = p.cancel as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8"));
}

describe("runCli", () => {
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
        .mockResolvedValueOnce("user"); // target scope
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      confirm.mockResolvedValueOnce(true);
      multiselect.mockResolvedValueOnce([]);

      await runCli({ cwd: dir, env: {}, platform: "linux" });

      const written = await readJson(targetPath);
      expect(written.servers).toEqual({
        alpha: { type: "stdio", command: "node", args: ["alpha.js"] },
      });
      // Target didn't exist before, so nothing should have been backed up.
      expect((await readdir(dir)).some((f) => f.includes(".bak."))).toBe(false);
      expect(note).not.toHaveBeenCalledWith(expect.stringContaining("reset-project-choices"), expect.anything());
    });
  });

  it("resolves each conflict per the user's choice and backs up the existing target", async () => {
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
            skip1: { command: "source-skip" },
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
            skip1: { command: "target-skip" },
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
        // conflicts, in source-entry order: keep1, take1, skip1
        .mockResolvedValueOnce("keep-target")
        .mockResolvedValueOnce("take-source")
        .mockResolvedValueOnce("skip");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      confirm.mockResolvedValueOnce(true);
      multiselect.mockResolvedValueOnce([]);

      await runCli({ cwd: dir, env: {}, platform: "linux" });

      const written = await readJson(targetPath);
      expect(written.mcpServers).toEqual({
        add1: { command: "source-add" },
        same1: { command: "shared" },
        keep1: { command: "target-keep" },
        take1: { command: "source-take" },
        skip1: { command: "target-skip" },
        onlyInTarget: { command: "target-only" },
      });
      expect((await readdir(dir)).some((f) => f.includes(".bak."))).toBe(true);
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
        .mockResolvedValueOnce("project");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);

      await runCli({ cwd: dir, env: {}, platform: "linux" });

      expect(outro).toHaveBeenCalledWith(expect.stringContaining("Nothing to migrate"));
      expect(confirm).not.toHaveBeenCalled();
      expect(multiselect).not.toHaveBeenCalled();
      expect(await readJson(targetPath)).toEqual(JSON.parse(content));
    });
  });

  it("removes entries selected during post-migration cleanup", async () => {
    await withTmpDir(async (dir) => {
      const sourcePath = join(dir, "source-mcp.json");
      const targetPath = join(dir, "target-mcp.json");
      await writeFile(
        sourcePath,
        JSON.stringify({ mcpServers: { alpha: { command: "node" }, beta: { command: "node" } } }),
        "utf8",
      );

      select
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("global")
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("project");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      confirm.mockResolvedValueOnce(true);
      multiselect.mockResolvedValueOnce(["beta"]);

      await runCli({ cwd: dir, env: {}, platform: "linux" });

      const written = await readJson(targetPath);
      expect(written.mcpServers).toEqual({ alpha: { command: "node" } });
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
        .mockResolvedValueOnce("project");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      confirm.mockResolvedValueOnce(true);
      multiselect.mockResolvedValueOnce([]);

      await runCli({ cwd: dir, env: {}, platform: "linux" });

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
        .mockResolvedValueOnce("user");
      text.mockResolvedValueOnce(sourcePath).mockResolvedValueOnce(targetPath);
      confirm.mockResolvedValueOnce(true);
      multiselect.mockResolvedValueOnce([]);

      await runCli({ cwd: dir, env: {}, platform: "linux" });

      expect(note).not.toHaveBeenCalledWith(expect.stringContaining("reset-project-choices"), expect.anything());
    });
  });
});
