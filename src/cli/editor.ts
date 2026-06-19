import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Resolves the editor command: `$VISUAL`, then `$EDITOR`, then a platform default. */
export function resolveEditorCommand(env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string {
  return env.VISUAL || env.EDITOR || (platform === "win32" ? "notepad" : "vi");
}

/**
 * Writes `text` to a temp file, opens it in the resolved editor, and returns
 * the file's contents after the editor exits.
 */
export async function editText(
  text: string,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mcp-config-migrator-merge-"));
  const filePath = join(dir, "entry.json");
  try {
    await writeFile(filePath, text, "utf8");
    const command = resolveEditorCommand(env, platform);
    const result = spawnSync(`${command} "${filePath}"`, { shell: true, stdio: "inherit" });
    if (result.error) {
      throw new Error(`Failed to launch editor "${command}": ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(`Editor "${command}" exited with status ${result.status}`);
    }
    return await readFile(filePath, "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
