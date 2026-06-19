## 1. Resolution type and merge application

- [x] 1.1 Change `ConflictResolution` in `src/engine/merge.ts` from a string union to a discriminated union: `{ kind: "accept-target" } | { kind: "accept-source" } | { kind: "merge"; merged: NormalizedMcpServer }`
- [x] 1.2 Update `applyMerge()` to switch on `.kind`, using `merged` directly for the `"merge"` case
- [x] 1.3 Update `src/engine/merge.test.ts` for the new resolution shape

## 2. Summary reporting

- [x] 2.1 Add a `merged` category to `MigrationSummary` in `src/engine/summary.ts`
- [x] 2.2 Update `summarize()` to bucket entries by `.kind`, including the new merge bucket
- [x] 2.3 Update `src/engine/summary.test.ts` for the new category
- [x] 2.4 Update the summary note rendering in `src/cli/flow.ts` to display the merged category

## 3. Conflict-marker rendering

- [x] 3.1 Add `renderMergeScaffold()` to `src/engine/diff.ts` that walks `diffLines(targetJson, sourceJson)` hunks and emits merged text: unchanged hunks pass through plain, changed/added/removed hunks wrapped in `<<<<<<< target` / `=======` / `>>>>>>> source` markers
- [x] 3.2 Reuse the existing `forDisplay()` field filtering (excludes `name` and `extra`) for the text fed into this function
- [x] 3.3 Add tests covering: a single differing field surrounded by unmarked identical lines, and a field present only on one side (empty section on the other side of the markers). A wholly-identical-yet-conflict case isn't reachable given current equality semantics (identical common fields always classify as "unchanged", which `renderMergeScaffold` rejects), so that case is covered by the "non-conflict entry throws" test instead.

## 4. Editor spawning

- [x] 4.1 Add `src/cli/editor.ts` that writes given text to a temp file (`node:os.tmpdir()` + `node:fs`), resolves the editor command via `$VISUAL` → `$EDITOR` → platform default (`vi` on POSIX, `notepad` on Windows), spawns it via shell (so multi-word `$EDITOR` values like `"code --wait"` work) with inherited stdio, reads the file back, and cleans up the temp file
- [x] 4.2 Add tests for editor resolution order (mocking `env`/`platform`) and for `editText()` with `node:child_process` mocked, covering success, launch failure, and non-zero exit status

## 5. Validation and fix/redo loop

- [x] 5.1 Add `hasUnresolvedMarkers()`/`parseMergedServer()` to `src/engine/mergeParse.ts`: checks for leftover `<<<<<<<` / `=======` / `>>>>>>>` markers first, producing a specific error message when found
- [x] 5.2 `parseMergedServer()` otherwise parses the edited text as JSON and validates it directly against the normalized server shape (`transport` + transport-appropriate fields), rejecting unrecognized fields rather than reusing `entryToNormalized()` — the editor shows `NormalizedMcpServer`'s own field names (e.g. `"transport"`), not the raw per-adapter IDE schema (`"type"`) that `entryToNormalized()` expects, so reusing it as-is would silently misparse the transport field
- [x] 5.3 Added `src/cli/mergeFlow.ts`'s `resolveMergeConflict()`: on either failure, prompts the user (via `@clack/prompts`) to choose "Fix" (reopen editor with their edited text) or "Redo" (reopen editor with the original conflict-marker scaffold), looping until valid or cancelled (via the shared `CliCancelled`/`unwrap` in `src/cli/cancel.ts`)
- [x] 5.4 Added tests in `mergeParse.test.ts` (parsing/validation cases) and `mergeFlow.test.ts` (valid-first-try, marker rejection + Fix, invalid JSON + Redo, cancellation)

## 6. CLI wiring

- [x] 6.1 Add the third "Merge…" option to the `p.select` in `resolveConflicts()` in `src/cli/flow.ts`
- [x] 6.2 Wire the merge option through conflict-marker rendering → editor spawn → validation loop → store as `{ kind: "merge", merged }` in `resolutions`; `resolveConflicts()` now takes `env`/`platform` so they can reach the editor spawn
- [x] 6.3 Update `changedServerNames()` in `src/cli/flow.ts` to treat merged entries as changed (for the Claude Code re-approval notice)
- [x] 6.4 Updated `src/cli/flow.test.ts` to cover choosing "Merge…" end to end, with `./editor.js`'s `editText` mocked

## 7. Spec and docs sync

- [x] 7.1 Confirmed `specs/config-migration-engine/spec.md` in this change directory correctly deltas the live spec (MODIFIED "Conflict resolution choice"/"Migration summary", ADDED "Conflict merge editor"/"Merge editor validation and recovery") — will land in `openspec/specs/` at archive time
- [x] 7.2 Updated README.md (usage step 3, example summary output) and docs/spec.md (engine/CLI layer descriptions, non-goals list — removed the now-obsolete "no field-level conflict merge" entry and fixed its stale path reference to the archived design doc)
