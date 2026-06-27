import type { IdeAdapter } from "./types.js";
import { vscodeAdapter } from "./vscode.js";
import { cursorAdapter } from "./cursor.js";
import { claudeCodeAdapter } from "./claudeCode.js";
import { piAdapter } from "./pi.js";

export const adapters: readonly IdeAdapter[] = [vscodeAdapter, cursorAdapter, claudeCodeAdapter, piAdapter];

const adapterById = new Map(adapters.map((adapter) => [adapter.id, adapter]));

export function getAdapter(id: string): IdeAdapter {
  const adapter = adapterById.get(id);
  if (!adapter) {
    throw new Error(`Unknown IDE adapter: ${id}`);
  }
  return adapter;
}
