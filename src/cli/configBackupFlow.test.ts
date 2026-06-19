import { join } from "node:path";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { withTmpDir } from "../test/tmp.js";
import { readVersionsStore, setBackupLocation, setPreference } from "../model/versionsStore.js";

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  note: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
  isCancel: () => false,
  select: vi.fn(),
  text: vi.fn(),
}));

import * as p from "@clack/prompts";
import { runConfigBackup } from "./configBackupFlow.js";

const select = p.select as unknown as Mock;
const text = p.text as unknown as Mock;
const note = p.note as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runConfigBackup", () => {
  it("shows the current preference and location, and leaves them unchanged when reselected", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      await setPreference(settingsPath, "alwaysOn");

      select.mockResolvedValueOnce("alwaysOn");
      text.mockResolvedValueOnce(settingsPath);

      await runConfigBackup({ settingsPath });

      expect(note).toHaveBeenCalledWith(expect.stringContaining("Always back up"), "Current settings");
      const store = await readVersionsStore(settingsPath);
      expect(store.configured).toBe("alwaysOn");
      expect(store.backupLocation).toBeUndefined();
    });
  });

  it("changes the preference when a different value is selected", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");

      select.mockResolvedValueOnce("alwaysOff");
      text.mockResolvedValueOnce(settingsPath);

      await runConfigBackup({ settingsPath });

      const store = await readVersionsStore(settingsPath);
      expect(store.configured).toBe("alwaysOff");
    });
  });

  it("changes the storage location to a non-default path", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      const elsewhere = join(dir, "elsewhere.json");

      select.mockResolvedValueOnce("alwaysAsk");
      text.mockResolvedValueOnce(elsewhere);

      await runConfigBackup({ settingsPath });

      const store = await readVersionsStore(settingsPath);
      expect(store.backupLocation).toBe(elsewhere);
      expect(store.versionsPath).toBe(elsewhere);
    });
  });

  it("clears the storage location when set back to the canonical settings path", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      await setBackupLocation(settingsPath, join(dir, "elsewhere.json"));

      select.mockResolvedValueOnce("alwaysAsk");
      text.mockResolvedValueOnce(settingsPath);

      await runConfigBackup({ settingsPath });

      const store = await readVersionsStore(settingsPath);
      expect(store.backupLocation).toBeUndefined();
      expect(store.versionsPath).toBe(settingsPath);
    });
  });
});
