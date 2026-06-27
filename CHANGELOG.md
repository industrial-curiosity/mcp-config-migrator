# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Pre-summary edit step: after conflict resolution and before the summary, an optional multiselect lets the user choose any servers to edit in their `$EDITOR` before anything is written. The editor opens with a skip-instruction header (`// To SKIP this server, clear all content and save.`) followed by the server's normalized JSON; saving a cleared file (empty, whitespace-only, or `{}`) removes the server from the write entirely. The same fix-or-redo validation loop used for conflict merge editing applies here.
- `Skipped (N)` category in the migration summary, listing any servers omitted via the pre-summary edit step. Reclassification rules: skipped entries move to **Skipped** regardless of original classification; manually edited unchanged entries move to **Conflicts resolved → merged**; edited conflict-accept entries also move to **merged**; edited "add" entries stay in **Added**.
- `ManualEdits` type (`{ edited: Set<string>; skipped: Set<string> }`) as the interface between `editMergedServers()` and `summarize()`; `summarize()` accepts it as an optional third parameter so existing call sites are unaffected.
- Pi IDE adapter: migrate MCP server configs to and from Pi using any of its four config scopes — global shared (`~/.config/mcp/mcp.json`), Pi global override (`~/.pi/agent/mcp.json`), project shared (`.mcp.json`), and Pi project override (`.pi/mcp.json`). Config files are loaded in precedence order; later entries override earlier ones.
- Scope selection hints: each Pi scope option displays its resolved path and a brief description of its precedence and sharing behavior (e.g. "shared across all MCP tools" or "Pi-specific; overrides global shared"). The `DefaultPathCandidate` interface gains an optional `hint` field that any adapter can use; non-Pi adapters are unaffected.
- Prerequisite notice when Pi is selected as a migration or restore target: because Pi has no built-in MCP support, the CLI displays a notice to install `pi-mcp-adapter` (`pi install npm:pi-mcp-adapter`) before proceeding with the write.

## [0.1.0] - 2026-06-18

### Added

- Initial release of `mcp-config-migrator`, an interactive CLI to migrate and merge MCP server configurations between VS Code, Cursor, and Claude Code.
- IDE adapters for VS Code, Cursor, and Claude Code: parsing/serializing each IDE's MCP config schema, computing platform-aware default paths (respecting `CLAUDE_CONFIG_DIR` and `XDG_CONFIG_HOME`), and surgical read-modify-write so unrelated file content is preserved.
- Migration engine: classifies entries as added/unchanged/conflicting, lets the user resolve each conflict by accepting the source's definition, accepting the target's definition, or merging the two interactively, and produces a migration summary (including a merged-resolution count) before any write.
- Conflict merge editor: opens an editor with the source and target definitions combined into one document, identical fields merged automatically and differing fields wrapped in git-style conflict markers (`<<<<<<< target` / `=======` / `>>>>>>> source`), with the adapter-specific `extra` field bag excluded since it isn't shown to the user. The edited result is validated (no leftover markers, valid server shape) before being accepted, with a fix-or-redo loop on failure.
- A re-approval notice when project-scoped Claude Code servers change.
- Post-migration cleanup step to remove selected server entries from the target after migration.
- Opt-in, config-only backup: before a confirmed write, prompts "Yes" / "Yes, always" / "No" / "No, never" to back up the target's current MCP server entries (not the whole file) to an append-only version history at `~/mcp-config-migrator.versions.json` by default; only the two "always" choices persist a preference, and the backup storage location is editable and always displayed once a backup occurs. Replaces the previous unconditional whole-file `.bak.<timestamp>` backup.
- `restore` command: lists every backed-up version newest-first across all prior targets, previews a selected version's contents, and writes it directly back to its original IDE/scope/path without altering the version history.
- `config backup` command to view or change the persisted backup preference and storage location independent of a migration run.
- `--help` / `-h` / `/?` to list the available commands.
