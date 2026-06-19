## Why

Today, resolving a conflicting MCP server entry only offers two choices: accept the source's whole definition or accept the target's whole definition. Often neither side is fully correct — the user wants, say, target's `command` but source's `env`. There's no way to do that without manually re-running the migration and hand-editing the output file afterward.

## What Changes

- Add a third conflict resolution choice, "Merge…", alongside the existing "Accept source" / "Accept target" options.
- When chosen, build a git-style conflict-marker text from the source and target definitions (reusing the existing line diff already computed for the conflict note) — lines identical on both sides pass through unmarked, differing lines are wrapped in `<<<<<<< target` / `=======` / `>>>>>>> source` markers.
- Write that text to a temp file and open it in the user's editor (`$VISUAL` / `$EDITOR` / platform default), excluding the adapter-specific `extra` field bag since editing it would have no effect on the merged result.
- After the editor closes, parse and validate the result. If conflict markers remain or the content doesn't parse into a valid server entry, show the error and let the user choose to fix (reopen with their edits intact) or redo (reopen with the original conflict-marker scaffold).
- **BREAKING**: `ConflictResolution` changes from a plain string tag (`"accept-target" | "accept-source"`) to a structure that can also carry a merged entry payload. Any code depending on the old two-value union (including `summary.ts`'s reporting categories) needs updating.

## Capabilities

### New Capabilities

(none — this extends the existing conflict-resolution capability rather than introducing a new one)

### Modified Capabilities

- `config-migration-engine`: the "Conflict resolution choice" requirement currently allows exactly two resolutions (accept source, accept target); it gains a third ("merge", producing a custom combined definition via an interactive editor). The "Migration summary" requirement gains a third reporting bucket for merged entries.

## Impact

- `src/engine/merge.ts` — `ConflictResolution`/`ConflictResolutions` types and `applyMerge()` logic.
- `src/engine/summary.ts` — `MigrationSummary` gains a `merged` category.
- `src/engine/diff.ts` — new function to render conflict-marker text (alongside the existing `renderConflictDiff` used for the upfront note).
- New module for spawning the editor and running the parse/validate/fix-or-redo loop.
- `src/cli/flow.ts` — `resolveConflicts()` gains the third menu option and wiring to the new editor flow.
- `openspec/specs/config-migration-engine/spec.md` — requirement updates described above.
- No new npm dependencies; reuses `diff` (already a dependency) and Node's `child_process`/`fs` for the editor.
