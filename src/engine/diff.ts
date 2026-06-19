import { diffLines } from "diff";
import type { NormalizedMcpServer } from "../model/types.js";
import type { ClassifiedEntry } from "./classify.js";

function forDisplay(server: NormalizedMcpServer): Record<string, unknown> {
  const { name: _name, extra, ...rest } = server;
  const display: Record<string, unknown> = { ...rest };
  if (extra) display.extra = extra.fields;
  return display;
}

/** Renders a +/- line diff between a conflicting entry's target and source definitions. */
export function renderConflictDiff(entry: ClassifiedEntry): string {
  if (entry.kind !== "conflict" || !entry.target) {
    throw new Error(`renderConflictDiff requires a conflict entry: ${entry.name}`);
  }
  const targetJson = `${JSON.stringify(forDisplay(entry.target), null, 2)}\n`;
  const sourceJson = `${JSON.stringify(forDisplay(entry.source), null, 2)}\n`;

  const changes = diffLines(targetJson, sourceJson);
  return changes
    .map((change) => {
      const prefix = change.added ? "+" : change.removed ? "-" : " ";
      return change.value
        .split("\n")
        .filter((line, index, lines) => !(index === lines.length - 1 && line === ""))
        .map((line) => `${prefix} ${line}`)
        .join("\n");
    })
    .join("\n");
}

/**
 * Renders an editable merge scaffold for a conflicting entry: lines
 * identical between target and source pass through unmarked, differing
 * lines are wrapped in git-style conflict markers for the user to resolve
 * by hand.
 */
export function renderMergeScaffold(entry: ClassifiedEntry): string {
  if (entry.kind !== "conflict" || !entry.target) {
    throw new Error(`renderMergeScaffold requires a conflict entry: ${entry.name}`);
  }
  const targetJson = `${JSON.stringify(forDisplay(entry.target), null, 2)}\n`;
  const sourceJson = `${JSON.stringify(forDisplay(entry.source), null, 2)}\n`;

  const changes = diffLines(targetJson, sourceJson);
  const out: string[] = [];
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]!;
    if (!change.added && !change.removed) {
      out.push(change.value);
      continue;
    }
    if (change.removed) {
      const next = changes[i + 1];
      const sourceValue = next?.added ? next.value : "";
      if (next?.added) i++;
      out.push(conflictBlock(change.value, sourceValue));
      continue;
    }
    // A standalone added hunk: source has it, target doesn't.
    out.push(conflictBlock("", change.value));
  }
  return out.join("");
}

function conflictBlock(targetLines: string, sourceLines: string): string {
  return `<<<<<<< target\n${targetLines}=======\n${sourceLines}>>>>>>> source\n`;
}
