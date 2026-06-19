import { join } from "node:path";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { withTmpDir } from "../test/tmp.js";
import { readVersionsStore, setPreference } from "../model/versionsStore.js";
import type { NormalizedConfig } from "../model/types.js";

vi.mock("@clack/prompts", () => ({
  select: vi.fn(),
  text: vi.fn(),
  isCancel: () => false,
  log: { info: vi.fn(), warn: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import * as p from "@clack/prompts";
import { maybeBackup } from "./backupFlow.js";

const select = p.select as unknown as Mock;
const text = p.text as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

const config: NormalizedConfig = { servers: [{ name: "alpha", transport: "stdio", command: "node" }] };

function target(path: string) {
  return { ideId: "cursor", scopeId: "global", path, config };
}

describe("maybeBackup", () => {
  it("backs up silently with no prompt when the preference is alwaysOn, and displays the location", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      await setPreference(settingsPath, "alwaysOn");

      await maybeBackup(settingsPath, target(join(dir, "mcp.json")));

      expect(select).not.toHaveBeenCalled();
      expect(text).not.toHaveBeenCalled();
      const store = await readVersionsStore(settingsPath);
      expect(store.versions).toHaveLength(1);
      expect(store.configured).toBe("alwaysOn");
      expect(p.log.success).toHaveBeenCalledWith(expect.stringContaining(settingsPath));
    });
  });

  it("skips silently with no prompt when the preference is alwaysOff", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      await setPreference(settingsPath, "alwaysOff");

      await maybeBackup(settingsPath, target(join(dir, "mcp.json")));

      expect(select).not.toHaveBeenCalled();
      const store = await readVersionsStore(settingsPath);
      expect(store.versions).toHaveLength(0);
    });
  });

  it('backs up for this run only on "Yes", leaving the preference at alwaysAsk, and prompts for/displays the location', async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      select.mockResolvedValueOnce("yes");
      text.mockResolvedValueOnce(settingsPath);

      await maybeBackup(settingsPath, target(join(dir, "mcp.json")));

      expect(text).toHaveBeenCalledWith(expect.objectContaining({ initialValue: settingsPath }));
      const store = await readVersionsStore(settingsPath);
      expect(store.versions).toHaveLength(1);
      expect(store.configured).toBe("alwaysAsk");
      expect(p.log.success).toHaveBeenCalledWith(expect.stringContaining(settingsPath));
    });
  });

  it('backs up and persists alwaysOn on "Yes, always", and displays the location', async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      select.mockResolvedValueOnce("yes-always");
      text.mockResolvedValueOnce(settingsPath);

      await maybeBackup(settingsPath, target(join(dir, "mcp.json")));

      const store = await readVersionsStore(settingsPath);
      expect(store.versions).toHaveLength(1);
      expect(store.configured).toBe("alwaysOn");
      expect(p.log.success).toHaveBeenCalledWith(expect.stringContaining(settingsPath));
    });
  });

  it("persists a changed backup location entered at the location prompt", async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      const customLocation = join(dir, "custom-versions.json");
      select.mockResolvedValueOnce("yes-always");
      text.mockResolvedValueOnce(customLocation);

      await maybeBackup(settingsPath, target(join(dir, "mcp.json")));

      const store = await readVersionsStore(settingsPath);
      expect(store.backupLocation).toBe(customLocation);
      expect(store.versionsPath).toBe(customLocation);
      expect(store.versions).toHaveLength(1);
      expect(p.log.success).toHaveBeenCalledWith(expect.stringContaining(customLocation));
    });
  });

  it('skips for this run only on "No", leaving the preference at alwaysAsk', async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      select.mockResolvedValueOnce("no");

      await maybeBackup(settingsPath, target(join(dir, "mcp.json")));

      const store = await readVersionsStore(settingsPath);
      expect(store.versions).toHaveLength(0);
      expect(store.configured).toBe("alwaysAsk");
    });
  });

  it('skips and persists alwaysOff on "No, never"', async () => {
    await withTmpDir(async (dir) => {
      const settingsPath = join(dir, "settings.json");
      select.mockResolvedValueOnce("no-never");

      await maybeBackup(settingsPath, target(join(dir, "mcp.json")));

      const store = await readVersionsStore(settingsPath);
      expect(store.versions).toHaveLength(0);
      expect(store.configured).toBe("alwaysOff");
    });
  });
});
