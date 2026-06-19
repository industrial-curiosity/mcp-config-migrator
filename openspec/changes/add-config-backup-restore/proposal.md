## Why

The current automatic backup (`backupFile()`/`saveWithBackup()`) silently copies an entire target file — including unrelated content like `~/.claude.json`'s OAuth session tokens and trust state — into a sibling `.bak.<timestamp>` file on every write, with no way to restore short of manually locating that file. Users have no control over whether this happens, no way to see what's in a given backup before using it, and no built-in path back to a prior config state.

## What Changes

- **BREAKING**: Remove the automatic, unconditional, whole-file backup (`src/model/backup.ts`'s `backupFile()` and `src/engine/write.ts`'s `saveWithBackup()`). Every write through this path is replaced by the mechanism below.
- Add an opt-in, config-only backup step shown right after the user confirms the write and before it happens, offering exactly the target's current MCP server entries (not the whole file) be saved to a versioned history file.
- The prompt offers four options in order — "Yes", "Yes, always", "No", "No, never". Only the two "always" choices persist a preference and suppress future prompts; plain "Yes" and plain "No" decide this run only and leave the preference at "always ask", so the prompt still appears next time.
- Persisted settings and (by default) the version history both live in a single JSON file at `~/mcp-config-migrator.versions.json`, append-only — no prior version is ever overwritten or deleted by normal use.
- Add a `restore` command: lists every saved version (across all prior targets) with its timestamp, lets the user preview a version's contents, then writes it directly back to that version's original IDE/scope/path.
- Add a `config backup` command to view and change the persisted backup setting (and its storage location) at any time, independent of a migration run.
- Add `--help` / `-h` / `/?` to list the available commands.

## Capabilities

### New Capabilities
- `backup-and-restore`: opt-in versioned backup of a migration target's MCP server entries before a write, persisted tri-state backup preference, the `restore` command, the `config backup` command, and CLI help.

### Modified Capabilities
- `config-migration-engine`: removes the "Pre-write backup" requirement — backing up is no longer an automatic, unconditional part of writing a merged configuration.
- `cli-workflow`: "Final write confirmation" no longer bundles backup creation into the write step itself; backup is now a separate, conditional step governed by `backup-and-restore`.

## Impact

- `src/model/backup.ts`, `src/engine/write.ts` (`saveWithBackup`): removed/replaced.
- `src/cli/flow.ts`: write step no longer calls `saveWithBackup`; gains a backup-decision step driven by the persisted setting.
- `src/cli/index.ts`: first real command-line argument handling in this CLI (dispatch to migrate / `restore` / `config backup` / help).
- New modules for: the versions/settings file format and I/O, the `restore` flow, the `config backup` flow, and help text.
- README.md and docs/spec.md: backup/restore behavior described there needs updating.
