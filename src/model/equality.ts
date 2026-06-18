import type { NormalizedMcpServer } from "./types.js";

function arraysEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function recordsEqual(
  a: Record<string, string> | undefined,
  b: Record<string, string> | undefined,
): boolean {
  if (a === undefined || b === undefined) return a === b;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

/**
 * Compares the common normalized shape only — the adapter-specific `extra`
 * bag is excluded so cross-IDE entries that match on every shared field are
 * still classified as Unchanged.
 */
export function areServersEqual(a: NormalizedMcpServer, b: NormalizedMcpServer): boolean {
  return (
    a.name === b.name &&
    a.transport === b.transport &&
    a.command === b.command &&
    a.cwd === b.cwd &&
    a.url === b.url &&
    arraysEqual(a.args, b.args) &&
    recordsEqual(a.env, b.env) &&
    recordsEqual(a.headers, b.headers)
  );
}
