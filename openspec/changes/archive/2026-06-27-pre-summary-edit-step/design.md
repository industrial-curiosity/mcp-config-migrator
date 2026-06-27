## Context

The migration flow in `src/cli/flow.ts` runs: classify → resolve conflicts → `applyMerge()` → show summary → confirm → write. Conflict entries go through an interactive per-entry editor loop (`resolveMergeConflict` in `mergeFlow.ts`), but "add" and "unchanged" entries flow through silently. The existing editor infrastructure (`editText`, `parseMergedServer`) is fully reusable. `summarize()` in `engine/summary.ts` classifies entries into `added`, `unchanged`, and `conflicts.*` — it has no concept of manual skips or post-merge edits.

## Goals / Non-Goals

**Goals:**
- Insert an optional edit step between `applyMerge()` and `summarize()` in the migration flow.
- Allow the user to edit any server in the merged config via their `$EDITOR` (normalized JSON format, same as the conflict merge editor).
- Allow the user to skip any server by saving a cleared file — the server is omitted from the write. "Cleared" means the content after stripping the header line is empty, whitespace-only, or an empty JSON object (`{}`).
- Reflect manual edits and skips accurately in the migration summary.

**Non-Goals:**
- Allowing the user to add entirely new servers not present in the source.
- Editing server names (the file opened in the editor shows the normalized shape without `name`).
- Applying the edit step to the restore flow (that flow writes a previous backup verbatim; editing it would defeat its purpose).
- Editing during a no-op run (the early-exit path is taken before the edit step is ever reached).

## Decisions

### 1. Placement: after `applyMerge`, before `summarize`

The edit step operates on the merged `NormalizedConfig` (the `applyMerge` output). Operating on the merged result means: (a) the user sees a single coherent view of what will be written regardless of how each entry was classified; (b) the summary shown immediately after reflects exactly what will be written.

**Alternative considered**: insert the edit step before `applyMerge`, operating on individual `ClassifiedEntry` objects. Rejected — the user would have to understand the classification system to make sense of which entries appear; the merged view is simpler.

### 2. Skip mechanic: cleared content = skip

The editor is opened with the skip instruction header followed by the server's normalized JSON. After the editor closes, a `isSkipSignal` check runs before `parseMergedServer` is invoked. The skip signal is true when the content after stripping the header line is: empty, whitespace-only, or an empty JSON object (`{}` with optional internal whitespace). The pre-validation ordering is critical — without it, `{}` would reach `parseMergedServer` and fail with a "transport required" error rather than being recognized as a skip.

`parseMergedServer` itself is not changed.

**Alternative considered**: a separate `p.multiselect` for "which to skip" alongside "which to edit." Rejected — two multi-selects adds friction; the editor-clear convention is a well-understood pattern for this class of CLI tool.

### 3. `ManualEdits` as an explicit type passed to `summarize`

The edit step returns `{ updatedConfig: NormalizedConfig; manualEdits: ManualEdits }` where `ManualEdits = { edited: Set<string>; skipped: Set<string> }`. `summarize()` gains an optional third parameter. The reclassification logic (original classification × manual edit action → summary bucket) lives inside `summarize`.

Reclassification table:

| classification | resolution | manual edit | summary bucket |
|---|---|---|---|
| add | — | none / edited | added |
| add | — | skipped | skipped |
| unchanged | — | none | unchanged |
| unchanged | — | edited | conflicts.merged |
| unchanged | — | skipped | skipped |
| conflict | accept-target | none | conflicts.acceptTarget |
| conflict | accept-target | edited | conflicts.merged |
| conflict | accept-target | skipped | skipped |
| conflict | accept-source | none | conflicts.acceptSource |
| conflict | accept-source | edited | conflicts.merged |
| conflict | accept-source | skipped | skipped |
| conflict | merge | none / edited | conflicts.merged |
| conflict | merge | skipped | skipped |

**Alternative considered**: pre-process the `classifications` array before calling `summarize` to reflect edits. Rejected — mutating the classifications array conflates classification (source vs target comparison) with edit outcomes; keeping them separate makes the data model clearer.

### 4. New file `src/cli/editStep.ts`

The edit step logic is extracted into its own module rather than inlined in `flow.ts`. `flow.ts` is already long; the edit step has its own loop, data type, and editor interaction that merits isolation.

### 5. Editor template includes a skip instruction comment

The file opened in the editor prepends a JSON comment line: `// Clear all content to skip this server`. JSON doesn't support comments, but the instruction is stripped before JSON parsing (it's only in the template preamble, not the actual object). This surfaces the skip mechanic discoverably without extra prompts.

**Alternative considered**: show a `p.note` before opening the editor explaining the skip mechanic. Rejected — adding a note before every editor invocation is noisy; the inline comment is visible at the moment of relevance.

## Risks / Trade-offs

- **`parseMergedServer` rejects IDE-specific extra fields** → The editor shows the normalized shape, not the raw source entry. If the source had `directTools` or similar extra fields, those won't appear in the editor. They are preserved from the source in the merged config untouched (unless the user edits the entry, at which point `parseMergedServer` produces a clean normalized shape and the extras are lost). This is a known limitation of the normalized editor and is consistent with how conflict merge editing already works.
- **"Skip all" leaves an empty migration** → If the user skips every server, `applyMerge` still runs but the edit step removes everything. The summary would show `Skipped (N)`, `Added (0)` etc., and the write still happens (writing an empty `mcpServers` object). This is correct behavior — the user made an explicit choice.
- **Editor may not be configured** → `editText` falls back to `vi` / `notepad` if `$VISUAL`/`$EDITOR` are unset; this is existing behavior shared with conflict merge editing.
