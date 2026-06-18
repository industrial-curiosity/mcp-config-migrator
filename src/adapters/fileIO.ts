import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

/** Returns "" if the file doesn't exist yet. */
export async function readTextFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw err;
  }
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

export function parseJsonObject(text: string): Record<string, unknown> {
  if (text.trim() === "") return {};
  const parsed = JSON.parse(text);
  return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
}
