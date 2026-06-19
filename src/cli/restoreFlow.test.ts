import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { withTmpDir } from "../test/tmp.js";
import { appendVersion, readVersionsStore } from "../model/versionsStore.js";
import type { BackupVersion } from "../model/versionsStore.js";

const { CANCEL } = vi.hoisted(() => ({ CANCEL: Symbol("cancel") }));

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  note: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
  isCancel: (value: unknown) => value === CANCEL,
  select: vi.fn(),
  text: vi.fn(),
  confirm: vi.fn(),
}));

import * as p from "@clack/prompts";
import { runRestore } from "./restoreFlow.js";

const select = p.select as unknown as Mock;
const confirm = p.confirm as unknown as Mock;
const note = p.note as unknown as Mock;
const outro = p.outro as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

const entry = (overrides: Partial<BackupVersion> = {}): BackupVersion => ({
  timestamp: "2026-01-01T00:00:00.000Z",
  ideId: "cursor",
  scopeId: "global",
  path: "",
  servers: [{ name: "alpha", transport: "stdio", command: "node" }],
  ...overrides,
});

describe("runRestore", () => {
  it("lists versions newest-first, previews the selection, and restores it without touching the version history", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      const targetPath = join(dir, "mcp.json");
      await appendVersion(settingsPath, entry({ timestamp: "2026-01-01T00:00:00.000Z", path: targetPath, servers: [{ name: "old", transport: "stdio", command: "node" }] }));
      await appendVersion(settingsPath, entry({ timestamp: "2026-01-02T00:00:00.000Z", path: targetPath, servers: [{ name: "newer", transport: "stdio", command: "node" }] }));

      select.mockResolvedValueOnce(0); // newest-first, so index 0 is the 2026-01-02 entry
      confirm.mockResolvedValueOnce(true);

      await runRestore({ filePath: settingsPath });

      const options = select.mock.calls[0]![0].options;
      expect(options[0].label).toContain("2026-01-02");
      expect(options[1].label).toContain("2026-01-01");

      expect(note).toHaveBeenCalledWith(expect.stringContaining("newer"), expect.anything());

      const written = JSON.parse(await readFile(targetPath, "utf8"));
      expect(written.mcpServers).toEqual({ newer: { command: "node" } });

      const store = await readVersionsStore(settingsPath);
      expect(store.versions).toHaveLength(2);
    });
  });

  it("does not restore when the user declines the final confirmation", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      const targetPath = join(dir, "mcp.json");
      await appendVersion(settingsPath, entry({ path: targetPath }));

      select.mockResolvedValueOnce(0);
      confirm.mockResolvedValueOnce(false);

      await runRestore({ filePath: settingsPath });

      expect(outro).toHaveBeenCalledWith(expect.stringContaining("cancelled"));
    });
  });

  it("reports when there are no backed-up versions", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");

      await runRestore({ filePath: settingsPath });

      expect(outro).toHaveBeenCalledWith(expect.stringContaining("No backed-up versions"));
      expect(select).not.toHaveBeenCalled();
    });
  });

  it("restores to the recorded IDE adapter and path even across multiple targets", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      const claudePath = join(dir, ".mcp.json");
      await appendVersion(
        settingsPath,
        entry({ ideId: "claude-code", scopeId: "project", path: claudePath, servers: [{ name: "beta", transport: "stdio", command: "node" }] }),
      );

      select.mockResolvedValueOnce(0);
      confirm.mockResolvedValueOnce(true);

      await runRestore({ filePath: settingsPath });

      const written = JSON.parse(await readFile(claudePath, "utf8"));
      expect(written.mcpServers).toEqual({ beta: { command: "node" } });
    });
  });
});
