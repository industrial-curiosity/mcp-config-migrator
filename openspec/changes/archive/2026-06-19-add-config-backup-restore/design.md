## Context

Today, every write to a target config file is preceded by an unconditional, silent, whole-file copy (`src/model/backup.ts`'s `backupFile()`, invoked by `src/engine/write.ts`'s `saveWithBackup()`). For `~/.claude.json` this duplicates OAuth session data and trust state into a plaintext `.bak.<timestamp>` sibling file on every run, with no built-in way to restore from it. This change replaces that mechanism with an opt-in, config-only, versioned backup that the user can inspect and restore from via new CLI commands. It also introduces the CLI's first real command-line argument handling — today `src/cli/index.ts` unconditionally runs the interactive migrate flow with no argument parsing at all.

## Goals / Non-Goals

**Goals:**
- Back up only the target's MCP server entries (not the whole file) before a write, opt-in per the user's persisted preference.
- Let the preference ("always ask" / "always back up" / "never back up") persist across runs without re-prompting.
- Store backups append-only, across all targets, in one file, so any prior version can always be restored ("restore forward" if a wrong pick is made).
- Add `restore`, `config backup`, and `--help`/`-h`/`/?` commands.

**Non-Goals:**
- No diff/merge during restore — restoring directly overwrites the target's MCP server entries with the selected version's.
- No pruning, expiry, or size limit on the versions file.
- No per-target backup files or directories — one shared file, as specified by the user.
- No change to how adapters read/write their native schema (`IdeAdapter.load`/`save` untouched).

## Decisions

### Settings + versions file format

A single JSON file, by default `~/mcp-config-migrator.versions.json`:

```json
{
  "configured": "alwaysAsk" | "alwaysOn" | "alwaysOff",
  "backupLocation": "<optional path to a different file holding `versions`>",
  "versions": [
    { "timestamp": "<ISO 8601>", "ideId": "claude-code", "scopeId": "project", "path": "./.mcp.json", "servers": [/* NormalizedMcpServer[] */] }
  ]
}
```

- `configured` defaults to `"alwaysAsk"` when the file doesn't exist or the field is absent.
- `backupLocation`, when present, names a different file that holds the actual `versions` array; the canonical home-dir file then holds only `configured`/`backupLocation` and no `versions` of its own. When absent, `versions` lives directly in the canonical file. This lets the storage location be changed once (via `config backup`) without ever needing a per-run location prompt.
- Each version entry stores the full `NormalizedMcpServer[]`, **including `extra` fields** — unlike the merge editor's scaffold (which deliberately hides `extra` from the user), a backup is a machine-to-machine round trip with no editing step, so there's no reason to drop data a same-IDE restore could use losslessly.
- Alternative considered: one backup file per target (keyed by ide/scope/path). Rejected — the user explicitly wants a single global file; per-entry `ideId`/`scopeId`/`path` already disambiguates targets within it.

### Where backup happens in the flow

`src/cli/flow.ts`'s `runFlow()`, between the existing write-confirmation (`p.confirm`) and the call that writes the merged config, gains a backup-decision step. It operates on the already-loaded pre-merge `targetConfig` (no extra disk read needed) and the already-known `targetAdapter.id`/`target.scopeId`/`target.path`. `saveWithBackup()` and `backupFile()` are deleted; the write site calls `targetAdapter.save()` directly (no longer wrapped).

Decision step behavior, based on `configured`:
- `"alwaysOn"` → append a version silently, no prompt — then display the storage location via `p.log.success` (or equivalent), since the user never sees an interactive step to learn it from otherwise.
- `"alwaysOff"` → skip silently, no prompt, nothing to display.
- `"alwaysAsk"` (default) → `p.select` with four options in order, "Yes, always" default-highlighted:
  - "Yes" → prompt for the storage location (see below), append a version now; `configured` stays `"alwaysAsk"` (prompts again next time).
  - "Yes, always" → prompt for the storage location, append a version now; persist `configured: "alwaysOn"`.
  - "No" → skip this run; `configured` stays `"alwaysAsk"` (prompts again next time).
  - "No, never" → skip this run; persist `configured: "alwaysOff"`.

Plain "Yes" and plain "No" are deliberately equivalent, in their effect on persisted state, to the file never having recorded a preference at all — they only decide the current run. Only the two "always" options write to `configured`.

### Backup location is editable and always displayed

Storage location was previously only changeable out-of-band via `config backup`, and a successful backup never told the user where it went — both gaps reported after initial use. Fixed by:

- After "Yes"/"Yes, always" is chosen, `maybeBackup` prompts with `p.text` for the storage location, pre-filled with the currently effective `store.versionsPath` as an editable default (the same "suggested default, always editable" convention used for config paths elsewhere in this CLI). If the answer differs from the current effective location, it's persisted via `setBackupLocation` — exactly as if the user had run `config backup` first, so the change sticks for future runs too.
- After every backup that actually occurs — interactive or the silent `"alwaysOn"` case — `maybeBackup` displays the storage location the entry was written to. The silent path has no other prompt, so this is the only feedback the user gets that a backup happened and where.
- "No"/"No, never" never reach the location prompt or the display, since no backup occurs.

### New CLI commands and argument handling

No CLI-framework dependency is added — a small hand-rolled parser matches this project's existing zero-new-dependency pattern. `src/cli/index.ts` dispatches on `process.argv.slice(2)`:

| Invocation | Behavior |
|---|---|
| *(none)* | existing interactive migrate flow |
| `restore` / `restore --file <path>` / `restore -f <path>` | list versions, preview, confirm, restore |
| `config backup` | view/change the persisted setting and storage location |
| `--help`, `-h`, `/?` | print command list |

`restore` without `--file`/`-f` prompts for a location with the canonical home-dir file as the editable default (same "suggested default, always editable" convention used for config paths elsewhere in this CLI).

### Restore flow

Reads the active versions store (resolved through `backupLocation` if set), lists every entry newest-first as `<timestamp> — <IDE label> (<scope label>) — <path>` via `p.select`, shows the selected entry's `servers` pretty-printed via `p.note` for review, then on confirmation calls `getAdapter(ideId).save(path, { servers })` directly — no classification, diffing, or conflict resolution. The versions array itself is never mutated by a restore, so every prior snapshot remains available afterward.

### `config backup` flow

Shows the current `configured` value and effective storage location, offers a `p.select` to change `configured`, and a `p.text` (default = current location) to change `backupLocation` — entering the settings file's own path clears `backupLocation` rather than storing it redundantly.

## Risks / Trade-offs

- **Unbounded growth**: the versions file accumulates forever with no pruning → acceptable for now (entries are small JSON); a future `prune`/`forget` command is the natural follow-up if this becomes a problem.
- **No file locking**: concurrent invocations could race on the same versions file → consistent with this CLI's existing single-user, no-locking assumptions elsewhere; not addressed here.
- **Breaking change**: anyone relying on the old `.bak.<timestamp>` files loses them going forward → called out as **BREAKING** in the proposal; acceptable pre-1.0.
- **Corrupt/unreadable `backupLocation` target**: surfaced as a clear error (not a silent fallback to the canonical file), since silently switching storage locations could hide where a user's backups actually are.

## Migration Plan

No data migration needed — this is a pre-1.0 project with no existing `.bak.*` files to convert. The new versions file is created lazily on first opt-in (or first `config backup` use). Removing `backupFile()`/`saveWithBackup()` is a direct deletion; nothing else in the codebase depends on them outside `flow.ts`.
