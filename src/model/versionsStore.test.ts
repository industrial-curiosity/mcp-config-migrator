import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withTmpDir } from "../test/tmp.js";
import { appendVersion, readVersionsStore, setBackupLocation, setPreference } from "./versionsStore.js";
import type { BackupVersion } from "./versionsStore.js";

const entry = (overrides: Partial<BackupVersion> = {}): BackupVersion => ({
  timestamp: "2026-01-01T00:00:00.000Z",
  ideId: "cursor",
  scopeId: "global",
  path: "/tmp/mcp.json",
  servers: [{ name: "alpha", transport: "stdio", command: "node" }],
  ...overrides,
});

describe("readVersionsStore", () => {
  it("defaults to alwaysAsk and an empty version list when the settings file doesn't exist", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      const store = await readVersionsStore(settingsPath);
      expect(store.configured).toBe("alwaysAsk");
      expect(store.backupLocation).toBeUndefined();
      expect(store.versionsPath).toBe(settingsPath);
      expect(store.versions).toEqual([]);
    });
  });

  it("reads versions from backupLocation when set, not from the settings file", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      const locationPath = join(dir, "elsewhere.json");
      await setBackupLocation(settingsPath, locationPath);
      await appendVersion(settingsPath, entry());

      const settingsRaw = JSON.parse(await readFile(settingsPath, "utf8"));
      expect(settingsRaw.versions).toBeUndefined();

      const store = await readVersionsStore(settingsPath);
      expect(store.versionsPath).toBe(locationPath);
      expect(store.versions).toEqual([entry()]);
    });
  });
});

describe("appendVersion", () => {
  it("creates the history on first append and appends without removing prior entries", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");

      await appendVersion(settingsPath, entry({ timestamp: "2026-01-01T00:00:00.000Z" }));
      await appendVersion(settingsPath, entry({ timestamp: "2026-01-02T00:00:00.000Z" }));

      const store = await readVersionsStore(settingsPath);
      expect(store.versions).toEqual([
        entry({ timestamp: "2026-01-01T00:00:00.000Z" }),
        entry({ timestamp: "2026-01-02T00:00:00.000Z" }),
      ]);
    });
  });
});

describe("setPreference", () => {
  it("persists the preference and preserves other fields", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      await appendVersion(settingsPath, entry());

      await setPreference(settingsPath, "alwaysOn");

      const store = await readVersionsStore(settingsPath);
      expect(store.configured).toBe("alwaysOn");
      expect(store.versions).toEqual([entry()]);
    });
  });
});

describe("setBackupLocation", () => {
  it("clears backupLocation when set to undefined", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      await setBackupLocation(settingsPath, join(dir, "elsewhere.json"));
      await setBackupLocation(settingsPath, undefined);

      const store = await readVersionsStore(settingsPath);
      expect(store.backupLocation).toBeUndefined();
      expect(store.versionsPath).toBe(settingsPath);
    });
  });
});
