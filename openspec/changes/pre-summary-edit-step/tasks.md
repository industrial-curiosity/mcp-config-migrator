## 1. ManualEdits Type and Summary Extension

- [ ] 1.1 Add `ManualEdits` type to `src/engine/summary.ts`: `{ edited: Set<string>; skipped: Set<string> }`
- [ ] 1.2 Add `skipped: CategorySummary` to `MigrationSummary` in `src/engine/summary.ts`
- [ ] 1.3 Update `summarize()` in `src/engine/summary.ts` to accept optional `ManualEdits` third parameter and apply the reclassification table (see design.md): skipped entries go to `skipped`; manually edited unchanged/conflict-accept entries move to `conflicts.merged`; edited add entries stay in `added`; default behavior (no ManualEdits) is unchanged
- [ ] 1.4 Update `summarize()` unit tests in `src/engine/summary.test.ts` to cover: no ManualEdits (existing behavior unchanged), skipped add, skipped unchanged, skipped conflict, edited unchanged → merged, edited conflict-accept-target → merged, edited add → still added

## 2. Edit Step Module

- [ ] 2.1 Create `src/cli/editStep.ts` exporting `ManualEdits` type and `editMergedServers(merged: NormalizedConfig, env: NodeJS.ProcessEnv, platform: NodeJS.Platform): Promise<{ updatedConfig: NormalizedConfig; manualEdits: ManualEdits }>`
- [ ] 2.2 Implement the multiselect prompt in `editMergedServers`: show all server names, none pre-selected; prompt message SHALL be `"Edit any server before writing? (clear the editor to skip a server — none required)"` so the skip mechanic is visible before the user selects; if none selected return immediately with empty ManualEdits
- [ ] 2.3 For each selected server: open `editText()` with a file whose first line is exactly `// To SKIP this server, clear all content and save.` followed by the server's normalized JSON (using `forDisplay()` from `diff.ts`); implement a `isSkipSignal(text: string): boolean` helper that strips the header line and returns true if the remainder is empty, whitespace-only, or an empty JSON object (`/^\s*\{?\s*\}?\s*$/.test(remainder)` or equivalent); if skip signal → log a confirmation (e.g. `p.log.info('Skipped: <name>')`) → add to `skipped`, remove from `updatedConfig`; this check MUST occur before calling `parseMergedServer`; otherwise validate with `parseMergedServer()` using the same fix-or-redo loop as `resolveMergeConflict` — on valid result add to `edited`, replace server in `updatedConfig`
- [ ] 2.4 Write unit tests in `src/cli/editStep.test.ts` covering: no servers selected (returns unchanged config, empty ManualEdits), server edited (updated in config, name in edited set), server skipped via empty file, server skipped via whitespace-only content, server skipped via `{}` (empty braces — must NOT trigger validation error), editor file opens with correct first line (`// To SKIP this server, clear all content and save.`), invalid JSON triggers fix-or-redo, skip log emitted on skip

## 3. Flow Integration

- [ ] 3.1 In `src/cli/flow.ts`, call `editMergedServers(merged, env, platform)` immediately after `applyMerge()` and before `summarize()`; pass the returned `manualEdits` as the third argument to `summarize()`; use `updatedConfig` (not `merged`) for the write
- [ ] 3.2 Update the summary display block in `flow.ts` to render the new `Skipped (N): <names>` line between `Unchanged` and `Conflicts resolved`

## 4. Documentation

- [ ] 4.1 Update `README.md` to mention the pre-summary edit step in the flow description and example run, including the skip-by-empty-file mechanic
