import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { setPreference } from "../model/versionsStore.js";
import { withTmpDir } from "../test/tmp.js";

const { CANCEL } = vi.hoisted(() => ({ CANCEL: Symbol("cancel") }));
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(), outro: vi.fn(), cancel: vi.fn(), note: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
  isCancel: (value: unknown) => value === CANCEL, select: vi.fn(), text: vi.fn(), confirm: vi.fn(),
}));
vi.mock("./editor.js", () => ({ editText: vi.fn() }));

import * as p from "@clack/prompts";
import { editText } from "./editor.js";
import { runEditCli } from "./editFlow.js";

const select = p.select as unknown as Mock;
const text = p.text as unknown as Mock;
const confirm = p.confirm as unknown as Mock;
const cancel = p.cancel as unknown as Mock;
const editTextMock = editText as unknown as Mock;

beforeEach(() => { vi.clearAllMocks(); select.mockReset(); });

async function settingsPath(dir: string): Promise<string> {
  const path = join(dir, "settings.json");
  await setPreference(path, "alwaysOff");
  return path;
}

describe("runEditCli", () => {
  it("writes an edited server after confirmation", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await writeFile(path, JSON.stringify({ mcpServers: { alpha: { command: "node" } } }));
      select.mockResolvedValueOnce("cursor").mockResolvedValueOnce("global").mockResolvedValueOnce("alpha").mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(path); confirm.mockResolvedValueOnce(true);
      editTextMock.mockResolvedValueOnce('{"transport":"stdio","command":"edited"}');
      await runEditCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPath(dir) });
      expect(JSON.parse(await readFile(path, "utf8")).mcpServers.alpha.command).toBe("edited");
    });
  });

  it("deletes a server through the editor skip signal", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await writeFile(path, JSON.stringify({ mcpServers: { alpha: { command: "node" } } }));
      select.mockResolvedValueOnce("cursor").mockResolvedValueOnce("global").mockResolvedValueOnce("alpha").mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(path); confirm.mockResolvedValueOnce(true); editTextMock.mockResolvedValueOnce("");
      await runEditCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPath(dir) });
      expect(JSON.parse(await readFile(path, "utf8")).mcpServers).toEqual({});
    });
  });

  it("adds a server and includes it in the direct-edit summary", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json");
      await writeFile(path, JSON.stringify({ mcpServers: {} }));
      select
        .mockResolvedValueOnce("cursor")
        .mockResolvedValueOnce("global")
        .mockResolvedValueOnce("add")
        .mockResolvedValueOnce("stdio")
        .mockResolvedValueOnce("done");
      text.mockResolvedValueOnce(path).mockResolvedValueOnce("gamma");
      editTextMock.mockResolvedValueOnce('{"transport":"stdio","command":"node"}');
      confirm.mockResolvedValueOnce(true);

      await runEditCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPath(dir) });

      expect(JSON.parse(await readFile(path, "utf8")).mcpServers).toEqual({ gamma: { command: "node" } });
      expect(p.note).toHaveBeenCalledWith(expect.stringContaining("Added (1): gamma"), "Edit summary");
    });
  });

  it("does not write when confirmation is declined", async () => {
    await withTmpDir(async (dir) => {
      const path = join(dir, "mcp.json"); const original = JSON.stringify({ mcpServers: { alpha: { command: "node" } } });
      await writeFile(path, original); select.mockResolvedValueOnce("cursor").mockResolvedValueOnce("global").mockResolvedValueOnce("done"); text.mockResolvedValueOnce(path); confirm.mockResolvedValueOnce(false);
      await runEditCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPath(dir) });
      expect(await readFile(path, "utf8")).toBe(original);
    });
  });

  it("cancels without writing", async () => {
    await withTmpDir(async (dir) => {
      select.mockResolvedValueOnce(CANCEL);
      await runEditCli({ cwd: dir, env: {}, platform: "linux", settingsPath: await settingsPath(dir) });
      expect(cancel).toHaveBeenCalled();
    });
  });
});
