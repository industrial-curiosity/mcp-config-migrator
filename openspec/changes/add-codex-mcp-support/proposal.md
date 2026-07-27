# Add Codex MCP Configuration Support

## Why

Users who configure MCP servers for Codex cannot currently migrate or merge those servers with the clients supported by this CLI. Codex uses its own TOML configuration format and supports both user and trusted-project configuration layers, so it needs a first-class adapter.

## What Changes

- Add Codex as a selectable MCP configuration source and target.
- Support Codex user and project configuration files.
- Read and write Codex `mcp_servers` TOML tables while preserving Codex-only server settings when round-tripping through Codex.
- Preserve unrelated configuration content when updating a Codex config file.
- Warn when Codex-only settings cannot be represented by another client.

## Capabilities

### New Capabilities

- `codex-mcp-configuration`: Migrate and merge MCP server configurations stored in Codex TOML configuration files.

### Modified Capabilities

- `ide-config-adapters`: Include Codex in the selectable IDE list and adapter serialization contract.

## Impact

- Adds a Codex adapter, adapter registration, and TOML configuration handling.
- Extends adapter, CLI flow, restore, and documentation coverage.
- May add a TOML parsing and lossless-editing dependency if the chosen implementation needs one.
