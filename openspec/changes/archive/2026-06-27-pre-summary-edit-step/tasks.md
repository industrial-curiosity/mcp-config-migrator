## 1. ManualEdits Type and Summary Extension

- [x] 1.1 Add `ManualEdits` type to `src/engine/summary.ts`: `{ edited: Set<string>; skipped: Set<string> }`
- [x] 1.2 Add `skipped: CategorySummary` to `MigrationSummary` in `src/engine/summary.ts`
- [x] 1.3 Update `summarize()` in `src/engine/summary.ts` to accept optional `ManualEdits` third parameter and apply the reclassification table (see design.md): skipped entries go to `skipped`; manually edited unchanged/conflict-accept entries move to `conflicts.merged`; edited add entries stay in `added`; default behavior (no ManualEdits) is unchanged
- [x] 1.4 Update `summarize()` unit tests in `src/engine/summary.test.ts` to cover: no ManualEdits (existing behavior unchanged), skipped add, skipped unchanged, skipped conflict, edited unchanged → merged, edited conflict-accept-target → merged, edited add → still added

## 2. Edit Step Module

- [x] 2.1 Create `src/cli/editStep.ts` exporting `ManualEdits` type and `editMergedServers(merged: NormalizedConfig, env: NodeJS.ProcessEnv, platform: NodeJS.Platform): Promise<{ updatedConfig: NormalizedConfig; manualEdits: ManualEdits }>`
- [x] 2.2 Implement the multiselect prompt in `editMergedServers`: show all server names, none pre-selected; prompt message SHALL be `"Edit any server before writing? (clear the editor to skip a server — none required)"` so the skip mechanic is visible before the user selects; if none selected return immediately with empty ManualEdits
- [x] 2.3 For each selected server: open `editText()` with a file whose first line is exactly `// To SKIP this server, clear all content and save.` followed by the server's normalized JSON; implement `isSkipSignal(text: string): boolean` helper exported for testing (strips header, returns true if remainder is empty, whitespace-only, or `{}`); if skip signal → `p.log.info('Skipped: <name>')` → add to skipped, remove from updatedConfig; check MUST occur before `parseMergedServer`; otherwise validate with fix-or-redo loop — on valid result add to edited, replace server in updatedConfig
- [x] 2.4 Write unit tests in `src/cli/editStep.test.ts` covering: no servers selected (returns unchanged config, empty ManualEdits), server edited (updated in config, name in edited set), server skipped via empty file, server skipped via whitespace-only content, server skipped via `{}` (empty braces — must NOT trigger validation error), editor file opens with correct first line (`// To SKIP this server, clear all content and save.`), invalid JSON triggers fix-or-redo, skip log emitted on skip

## 3. Flow Integration

- [x] 3.1 In `src/cli/flow.ts`, call `editMergedServers(merged, env, platform)` immediately after `applyMerge()` and before `summarize()`; pass the returned `manualEdits` as the third argument to `summarize()`; use `updatedConfig` (not `merged`) for the write
- [x] 3.2 Update the summary display block in `flow.ts` to render the new `Skipped (N): <names>` line between `Unchanged` and `Conflicts resolved`

## 4. Documentation

- [x] 4.1 Update `README.md` to mention the pre-summary edit step in the flow description and example run, including the skip-by-empty-file mechanic
