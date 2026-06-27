import type { IdeAdapter } from "./types.js";
import { claudeCodeAdapter } from "./claudeCode.js";
import { cursorAdapter } from "./cursor.js";
import { piAdapter } from "./pi.js";
import { vscodeAdapter } from "./vscode.js";

export const adapters: readonly IdeAdapter[] = [claudeCodeAdapter, cursorAdapter, piAdapter, vscodeAdapter];

const adapterById = new Map(adapters.map((adapter) => [adapter.id, adapter]));

export function getAdapter(id: string): IdeAdapter {
  const adapter = adapterById.get(id);
  if (!adapter) {
    throw new Error(`Unknown IDE adapter: ${id}`);
  }
  return adapter;
}
