# Codex MCP Configuration Support Design

## Context

The CLI normalizes MCP entries behind one `IdeAdapter` per client. Existing adapters use JSON or JSONC server maps, whereas Codex stores each MCP server in a TOML table under `mcp_servers.<name>`. Codex has a user file at `~/.codex/config.toml` and a trusted-project file at `.codex/config.toml`.

Codex supports fields beyond the shared normalized model, including OAuth settings, bearer-token environment variables, tool approval modes, tool filters, startup and tool timeouts, and server enablement. The shared model already preserves source-specific fields in `extra` for round trips through the same adapter.

## Goals / Non-Goals

**Goals:**

- Make Codex selectable as both migration source and target.
- Support global and project-scope Codex configuration files.
- Map shared stdio and streamable HTTP fields to the normalized model.
- Preserve Codex-specific server fields during Codex-to-Codex writes and report them as dropped for other target clients.
- Preserve non-MCP TOML configuration and its formatting when updating the server configuration.

**Non-Goals:**

- Manage Codex plugins, skills, hooks, profiles, trust settings, or OAuth credential storage.
- Modify the target project's trust status.
- Support deprecated SSE transport in Codex, which exposes streamable HTTP configuration.
- Add non-interactive migration or synchronization behavior.

## Decisions

### Add a dedicated `codex` adapter

Add `src/adapters/codex.ts` and register it beside the existing client adapters. Its default path candidates will be `~/.codex/config.toml` for user scope and `<cwd>/.codex/config.toml` for project scope.

This preserves the existing CLI and backup/restore flow because both consume the adapter registry. Extending an existing JSON adapter would conflate JSON and TOML behavior and make Codex-specific serialization harder to reason about.

### Treat the presence of `url` as streamable HTTP

Codex distinguishes stdio and streamable HTTP structurally: stdio entries use `command`; HTTP entries use `url`, without the shared model's `type` field. The adapter will normalize entries with `url` as `http`; all others are stdio. It will serialize normalized `http` entries with `url` and `http_headers`, and stdio entries with `command`, `args`, `cwd`, and `env`.

SSE cannot be faithfully written to Codex. Existing migration behavior will retain it only when round-tripping a Codex-origin `extra`; a cross-client SSE target to Codex must surface unsupported-field warnings rather than inventing a Codex transport.

### Keep Codex-only fields in `extra`

The adapter will classify shared fields as normalized fields and all remaining fields in an `mcp_servers.<name>` table as `extra` with `sourceIdeId: "codex"`. This includes Codex authorization, approval, filter, timeout, environment-whitelist, and enablement fields. Existing `normalizedToEntry` behavior then preserves them for Codex round trips and reports them when a different target cannot represent them.

This avoids broadening the cross-client data model with client-specific controls. The alternative—adding every Codex field to `NormalizedMcpServer`—would falsely imply that other clients support them.

### Use a lossless TOML table editor for writes

The adapter must replace only `mcp_servers` tables while keeping unrelated `config.toml` content byte-for-byte intact, including comments and formatting. Use a TOML parser/editor that can locate and replace table ranges in source text; if no suitable package exists, implement a narrowly scoped table-range editor plus TOML value serialization for generated server tables.

Parsing the entire TOML document and serializing it again is rejected because common TOML serializers discard comments and rewrite unrelated configuration. Invoking `codex mcp` is also rejected: it only manages the live Codex home configuration and cannot safely honor this CLI's arbitrary editable path flow.

### Preserve existing backup and restore behavior

Backup versions already record adapter id, scope id, configured path, and normalized servers including `extra`. No version schema migration is needed. Restoring a Codex entry will route through the new adapter via the existing registry.

## Risks / Trade-offs

- [Lossless TOML editing is more complex than parse-and-rewrite] → Keep the editor scoped to top-level `mcp_servers.<name>` tables and test comments, unrelated settings, nested server tables, replacement, and deletion.
- [Codex configuration evolves] → Preserve unknown per-server keys as `extra` and cover documented shared fields explicitly.
- [Project config is inactive for untrusted projects] → Document this Codex behavior without changing trust state.
- [Cross-client SSE cannot be represented by Codex] → Report dropped unsupported fields and avoid emitting an invalid Codex entry.

## Migration Plan

The change is additive and needs no persisted-data migration. Release the adapter with documentation and tests. Rollback consists of removing the adapter from the registry; existing backup entries remain readable only while the adapter is present, so rollback should not be deployed after users have created Codex backups without a compatibility plan.

## Open Questions

- Select a TOML dependency or confirm that a small lossless table editor can meet the formatting-preservation test cases without adding a dependency.
