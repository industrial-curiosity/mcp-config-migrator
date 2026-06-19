## 1. Resolution type and merge application

- [ ] 1.1 Change `ConflictResolution` in `src/engine/merge.ts` from a string union to a discriminated union: `{ kind: "accept-target" } | { kind: "accept-source" } | { kind: "merge"; merged: NormalizedMcpServer }`
- [ ] 1.2 Update `applyMerge()` to switch on `.kind`, using `merged` directly for the `"merge"` case
- [ ] 1.3 Update `src/engine/merge.test.ts` for the new resolution shape

## 2. Summary reporting

- [ ] 2.1 Add a `merged` category to `MigrationSummary` in `src/engine/summary.ts`
- [ ] 2.2 Update `summarize()` to bucket entries by `.kind`, including the new merge bucket
- [ ] 2.3 Update `src/engine/summary.test.ts` for the new category
- [ ] 2.4 Update the summary note rendering in `src/cli/flow.ts` to display the merged category

## 3. Conflict-marker rendering

- [ ] 3.1 Add a function to `src/engine/diff.ts` that walks `diffLines(targetJson, sourceJson)` hunks and emits merged text: unchanged hunks pass through plain, changed/added/removed hunks wrapped in `<<<<<<< target` / `=======` / `>>>>>>> source` markers
- [ ] 3.2 Reuse the existing `forDisplay()` field filtering (excludes `name` and `extra`) for the text fed into this function
- [ ] 3.3 Add tests covering: all-identical input (no markers), a single differing field (one marker block), a field present only on one side (empty section on the other side of the markers)

## 4. Editor spawning

- [ ] 4.1 Add a module (e.g. `src/cli/editor.ts`) that writes given text to a temp file (`node:os.tmpdir()` + `node:fs`), resolves the editor command via `$VISUAL` → `$EDITOR` → platform default (`vi` on POSIX, `notepad` on Windows), spawns it synchronously with inherited stdio, reads the file back, and cleans up the temp file
- [ ] 4.2 Add tests for editor resolution order (mocking `env`/`platform`), skipping or mocking the actual subprocess spawn

## 5. Validation and fix/redo loop

- [ ] 5.1 Add a check for leftover `<<<<<<<` / `=======` / `>>>>>>>` markers in the edited text, producing a specific error message when found
- [ ] 5.2 Otherwise parse the edited text as JSON and run it through `entryToNormalized()` (or equivalent), producing a validation error on parse/shape failure
- [ ] 5.3 On either failure, prompt the user (via `@clack/prompts`) to choose "Fix" (reopen editor with their edited text) or "Redo" (reopen editor with the original conflict-marker scaffold), looping until valid or cancelled
- [ ] 5.4 Add tests for: valid input accepted, marker-left-in-place rejected with correct message, invalid JSON rejected, fix path preserves edits, redo path resets to original scaffold

## 6. CLI wiring

- [ ] 6.1 Add the third "Merge…" option to the `p.select` in `resolveConflicts()` in `src/cli/flow.ts`
- [ ] 6.2 Wire the merge option through conflict-marker rendering → editor spawn → validation loop → store as `{ kind: "merge", merged }` in `resolutions`
- [ ] 6.3 Update `changedServerNames()` in `src/cli/flow.ts` to treat merged entries as changed (for the Claude Code re-approval notice)
- [ ] 6.4 Update `src/cli/flow.test.ts` to cover choosing "Merge…" end to end (with editor spawn mocked/injected)

## 7. Spec and docs sync

- [ ] 7.1 Confirm `openspec/specs/config-migration-engine/spec.md` reflects the merged delta correctly once this change is archived (no action needed now beyond what's in `specs/` — verify at archive time)
- [ ] 7.2 Update README.md and docs/spec.md to reflect any user-facing or architectural changes introduced by this change
