## Context

`classify()` (`src/engine/classify.ts`) marks each server entry as `add`, `unchanged`, or `conflict` by comparing normalized shapes (`src/model/equality.ts`). For `conflict` entries, `src/cli/flow.ts`'s `resolveConflicts()` shows a diff (`renderConflictDiff` in `src/engine/diff.ts`, built on the `diff` package's `diffLines`) and prompts for exactly one of `"accept-target"` / `"accept-source"` via `@clack/prompts`. `applyMerge()` (`src/engine/merge.ts`) then swaps in the source's whole entry or leaves the target's whole entry, keyed by that string tag. `summarize()` (`src/engine/summary.ts`) reports counts/names per resolution.

`NormalizedMcpServer` (`src/model/types.ts`) is a small typed object (`transport`, `command`, `args`, `cwd`, `env`, `url`, `headers`, plus an adapter-tagged `extra` bag) — not freeform text, and there's no common ancestor between source and target (just two independent sides). `entryToNormalized()` / `normalizedToEntry()` (`src/adapters/entryFields.ts`) already convert between this shape and a raw JSON-ish object, stashing/restoring unrecognized fields in `extra`.

There is currently no dependency on the `git` binary or a diff3 package, and no precedent for spawning a subprocess or writing temp files anywhere in the codebase.

## Goals / Non-Goals

**Goals:**
- Let a user combine pieces of both sides for a single conflicting entry, not just pick one side wholesale.
- Reuse the existing line diff rather than introducing a new diffing engine or dependency.
- Keep the manual-edit experience familiar (git-style conflict markers) without requiring `git` to be installed.
- Make invalid edits recoverable without losing the user's typing.

**Non-Goals:**
- True three-way/diff3 merge semantics (no common ancestor exists here, so this is intentionally a simpler two-way line diff with conflict markers, not a faithful diff3 port).
- Per-key merging inside nested objects (`env`, `headers`) — these are treated as plain JSON text lines like everything else; the conflict-marker rendering operates on the whole pretty-printed entry, not per-field.
- Editing or preserving `extra` through the merge editor (see Decisions).
- Any change to the `add` / `unchanged` classification logic.

## Decisions

### Conflict-marker rendering reuses `diffLines`, not a diff3 package

`diffLines(targetJson, sourceJson)` already produces the hunks needed: unchanged hunks pass through as plain merged lines; any hunk where `removed`/`added` differ gets wrapped as:
```
<<<<<<< target
...target's lines for this hunk...
=======
...source's lines for this hunk...
>>>>>>> source
```
A hunk that's pure-removed (target has it, source doesn't) or pure-added (source has it, target doesn't) still gets wrapped, with the missing side rendered as an empty section between markers. This is a new function in `src/engine/diff.ts`, sitting alongside the existing `renderConflictDiff` (which is unchanged and still drives the upfront read-only note shown before the resolution prompt).

**Alternative considered**: shelling out to `git merge-file` with a synthetic empty base. Rejected — adds a hard runtime dependency on `git` being installed for a capability that's achievable with the `diff` package already in `package.json`, and an empty-base diff3 merge doesn't behave meaningfully differently from a plain two-way line diff for objects this small.

**Alternative considered**: an npm diff3 package (e.g. `node-diff3`). Rejected for the same reason — no real third "base" side exists, so a true diff3 algorithm doesn't add value over wrapping `diffLines` hunks directly, and it's one less dependency to maintain.

### `extra` is excluded from the merge editor

`extra` is the adapter-specific field bag, tagged with the IDE that produced it (`ExtraFields.sourceIdeId`). On save, `normalizedToEntry()` only re-emits it when `extra.sourceIdeId === targetAdapter.id` — i.e., it only survives when source and target are the *same* IDE. Showing it as editable when it would be silently dropped on save is misleading, so it's excluded from the temp file entirely, regardless of whether source and target happen to be the same adapter. This keeps the merge editor consistent with the "relevant fields only" framing decided during exploration, and avoids adding conditional logic that varies the editable shape based on adapter identity.

**Trade-off accepted**: a same-IDE conflict (e.g. two Claude Code scopes) where `extra` actually differs can't have that difference merged through this editor — the user still has accept-source/accept-target for that case, just not field-level merging of `extra`.

### Editor selection: `$VISUAL` → `$EDITOR` → platform default, no new dependency

Resolution order matches the conventional Unix tool behavior (`$VISUAL` first, since it implies a full-screen editor is wanted; falls back to `$EDITOR`; falls back to `vi` on POSIX platforms and `notepad` on Windows). Implemented with a plain `child_process.spawnSync(editor, [tempFilePath], { stdio: "inherit" })` and a temp file via `node:fs` + `node:os.tmpdir()` — no new dependency (e.g. `external-editor`) needed since the spawn/temp-file logic is a handful of lines.

### Resolution payload changes shape, not just value set

`ConflictResolution` (currently `"accept-target" | "accept-source"`) becomes a discriminated union:
```ts
type ConflictResolution =
  | { kind: "accept-target" }
  | { kind: "accept-source" }
  | { kind: "merge"; merged: NormalizedMcpServer };
```
This is necessary because a merged entry is new data, not a pointer to source or target — `applyMerge()` needs the actual resolved object, and `summarize()` needs a third bucket (`merged`) alongside `acceptTarget`/`acceptSource`. This is the one BREAKING change in this proposal: any code matching on the old two-value string union must be updated to match on `.kind`.

### Validation failure: explicit Fix/Redo choice

After the editor closes, the file is checked for leftover `<<<<<<<`/`=======`/`>>>>>>>` markers (clear, specific error) before attempting to parse the rest as JSON and run it through `entryToNormalized()` (generic parse/shape error otherwise). On either failure, the error is shown and the user picks:
- **Fix** — reopen the editor with their edited content exactly as they left it, so they only need to address the reported problem.
- **Redo** — reopen the editor reset to the original conflict-marker scaffold, discarding their edits.

This loop repeats until the content validates or the user cancels the conflict resolution entirely (falling back to the existing cancel handling already in `flow.ts` via `CliCancelled`).

## Risks / Trade-offs

- **[Risk]** Pretty-printed JSON line diffs can produce awkward marker placement for multi-line nested structures (e.g. a fully-rewritten `env` block) where a person might expect field-level granularity. → **Mitigation**: accepted as a known limitation (see Non-Goals); the user can still freely rewrite the whole block by hand since the file is fully editable, not constrained to marker regions.
- **[Risk]** No `$EDITOR`/`$VISUAL` set and platform default editor (`vi`) is unfamiliar to the user, risking a confusing experience or stuck terminal session. → **Mitigation**: this matches `git`'s own fallback convention, which is the most common precedent users already navigate; out of scope to build a custom in-terminal editor.
- **[Risk]** The `ConflictResolution` type change is breaking for any external consumer of this package's types (it's published per `package.json`'s `exports`). → **Mitigation**: pre-1.0 (`version: 0.1.0`), so a breaking type change is acceptable without a major-version ceremony; called out explicitly in the proposal.

## Migration Plan

No data migration — this only changes in-memory types and CLI interaction during a single run. No persisted state depends on the old `ConflictResolution` shape. Rollout is a normal merge to `main`; no feature flag needed given the package's pre-1.0 status.
