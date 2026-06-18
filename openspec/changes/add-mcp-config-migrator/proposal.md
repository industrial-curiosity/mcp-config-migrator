# Proposal: Add mcp-config-migrator

## Why

Developers who use VSCode, Cursor, and Claude Code side by side currently configure MCP servers separately in each tool, using different file locations and schemas. There is no tool to migrate or merge MCP server entries between them, so switching tools or keeping multiple tools in sync means manually re-typing configuration.

## What Changes

- New npm package `mcp-config-migrator`, runnable via `npx mcp-config-migrator`, as an interactive CLI.
- Prompts the user to pick a source IDE and a target IDE from the supported list (VSCode, Cursor, Claude Code).
- Prompts for the source and target MCP config file paths, pre-filling each IDE's known default location and respecting relevant environment variable overrides (e.g. `CLAUDE_CONFIG_DIR` for Claude Code).
- Reads and normalizes each IDE's MCP config format into a common in-memory representation, accounting for schema differences between IDEs (e.g. key names, transport fields, scope of config file).
- Computes a diff between source and target: entries only in source are added to target; entries identical in both are left alone; entries present in both with different definitions are flagged as conflicts.
- Shows the user a diff for conflicting entries and prompts them to choose how to resolve each one (keep target, take source, skip).
- Writes the merged result back to the target IDE's config file in its native format, preserving unrelated existing target content.
- After migration, offers a cleanup step letting the user select target MCP entries to remove.

## Capabilities

### New Capabilities

- `ide-config-adapters`: Knowledge of each supported IDE's MCP config file location (including env var overrides and OS-specific defaults), on-disk schema, and read/write/serialize operations, plus a common normalized representation for MCP server entries.
- `config-migration-engine`: Diffing two normalized MCP configs, classifying entries as add/unchanged/conflict, applying user-chosen conflict resolutions, and producing a merged result.
- `cli-workflow`: The end-to-end interactive CLI flow — IDE selection, config path prompts, diff/conflict prompts, write confirmation, and post-migration cleanup prompts.

### Modified Capabilities

(none — this is a new project with no existing specs)

## Impact

- New repository content: `package.json`, TypeScript source under `src/`, a CLI bin entry point, and build/test tooling. No existing code is affected since this is a greenfield package.
- New runtime dependencies expected: an interactive prompt library (e.g. `@clack/prompts` or `inquirer`), a diffing utility, and a CLI argument/bin wrapper.
- Affects local files on the user's machine: reads and writes MCP config files for VSCode, Cursor, and Claude Code (e.g. `mcp.json`, `.cursor/mcp.json`, `claude_desktop_config.json` / Claude Code's config, subject to `CLAUDE_CONFIG_DIR`).
