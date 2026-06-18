import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { backupFile } from "./backup.js";
import { withTmpDir } from "../test/tmp.js";

describe("backupFile", () => {
  it("returns null when the file doesn't exist", async () => {
    await withTmpDir(async (dir) => {
      const result = await backupFile(join(dir, "missing.json"));
      expect(result).toBeNull();
    });
  });

  it("copies the existing file's contents to a timestamped backup path", async () => {
    await withTmpDir(async (dir) => {
      const filePath = join(dir, "mcp.json");
      await writeFile(filePath, '{"mcpServers":{}}', "utf8");

      const backupPath = await backupFile(filePath);

      expect(backupPath).not.toBeNull();
      expect(backupPath).not.toBe(filePath);
      expect(backupPath).toContain("mcp.json.bak.");
      const backupContents = await readFile(backupPath!, "utf8");
      expect(backupContents).toBe('{"mcpServers":{}}');
    });
  });
});
