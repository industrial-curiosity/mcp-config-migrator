## Why

Users of [Pi](https://github.com/earendil-works/pi) (an AI coding agent) want to migrate MCP server configs from tools like Claude Code, Cursor, or VS Code into Pi — but Pi is not yet a supported IDE in the migrator, leaving them to copy configs by hand.

## What Changes

- Add a `pi` IDE adapter that reads and writes Pi's MCP config format (`mcpServers` object) from the Pi global config file (`~/.pi/agent/mcp.json`) and the Pi project-local config (`.pi/mcp.json`).
- When Pi is selected as a **target**, display a prerequisite notice informing the user that `pi-mcp-adapter` must be installed (`pi install npm:pi-mcp-adapter`) before MCP servers will work, since Pi has no built-in MCP support.
- Register the new adapter in the adapter registry so Pi appears alongside VS Code, Cursor, and Claude Code in all CLI prompts.

## Capabilities

### New Capabilities

_(none — Pi support is an extension of the existing ide-config-adapters capability)_

### Modified Capabilities

- `ide-config-adapters`: The supported IDE list grows from three (VS Code, Cursor, Claude Code) to four (adding Pi). The scope selection, default path suggestion, and serialization requirements all apply to Pi with Pi-specific paths and format.

## Impact

- New source file: `src/adapters/pi.ts` (and `pi.test.ts`)
- `src/adapters/registry.ts` — register `piAdapter`
- `openspec/specs/ide-config-adapters/spec.md` — update the supported IDE list requirement and add Pi-specific scenarios for scope choice, default path, and the `pi-mcp-adapter` prerequisite notice
- No breaking changes; existing adapter behavior is unchanged
