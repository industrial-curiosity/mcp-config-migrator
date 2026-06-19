# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.0] - 2026-06-18

### Added

- Initial release of `mcp-config-migrator`, an interactive CLI to migrate and merge MCP server configurations between VS Code, Cursor, and Claude Code.
- IDE adapters for VS Code, Cursor, and Claude Code: parsing/serializing each IDE's MCP config schema, computing platform-aware default paths (respecting `CLAUDE_CONFIG_DIR` and `XDG_CONFIG_HOME`), and surgical read-modify-write so unrelated file content is preserved.
- Migration engine: classifies entries as added/unchanged/conflicting, lets the user resolve each conflict by accepting the source's definition, accepting the target's definition, or merging the two interactively, and produces a migration summary (including a merged-resolution count) before any write.
- Conflict merge editor: opens an editor with the source and target definitions combined into one document, identical fields merged automatically and differing fields wrapped in git-style conflict markers (`<<<<<<< target` / `=======` / `>>>>>>> source`), with the adapter-specific `extra` field bag excluded since it isn't shown to the user. The edited result is validated (no leftover markers, valid server shape) before being accepted, with a fix-or-redo loop on failure.
- Pre-write backup of the existing target file, and a re-approval notice when project-scoped Claude Code servers change.
- Post-migration cleanup step to remove selected server entries from the target after migration.
