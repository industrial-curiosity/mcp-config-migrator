## Why

When migrating servers between IDEs, the user often knows upfront that certain entries need tweaking — a different command path, adjusted env vars, or a server that shouldn't be carried over at all. Today the only options are to edit the source file before migrating, or edit the output file after. Neither is discoverable, and neither keeps the migration summary accurate. A pre-summary edit step surfaces this naturally, at exactly the moment the user is thinking about it.

## What Changes

- After conflict resolution and `applyMerge()`, but before the summary, offer an optional multiselect over all servers in the merged config so the user can choose which (if any) to edit in their `$EDITOR`.
- Editing a server opens the same normalized-JSON editor already used for conflict merges. Saving an empty file signals "skip this server" — it is omitted from the write entirely.
- The migration summary is updated to account for manual edits: skipped entries appear under a new **Skipped** category; manually edited unchanged entries move from **Unchanged** to **Conflicts resolved → merged**; manually edited servers in any other classification bucket also move to **merged**.
- The `MigrationSummary` type gains a `skipped` field; `summarize()` gains an optional third argument `ManualEdits`.
- The `cli-workflow` spec is updated to include the edit step in the required flow order.

## Capabilities

### New Capabilities

- `pre-summary-edit`: The optional per-server edit step, including the multiselect prompt, the editor loop, the skip-by-empty-file mechanic, and the `ManualEdits` data type.

### Modified Capabilities

- `cli-workflow`: The required interactive flow order gains the edit step between conflict resolution and the migration summary.

## Impact

- `src/cli/flow.ts` — call the new edit step between `applyMerge` and `summarize`; pass `ManualEdits` into `summarize`; update summary display to show **Skipped**
- `src/engine/summary.ts` — extend `MigrationSummary` with `skipped`; extend `summarize()` signature with optional `ManualEdits`
- New: `src/cli/editStep.ts` — `editMergedServers()` function and `ManualEdits` type
- `openspec/specs/cli-workflow/spec.md` — update the flow order requirement to include the edit step
- `README.md` — update the example run and flow description to mention the edit step
