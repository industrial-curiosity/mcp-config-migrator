# Add Codex MCP Configuration Support Tasks

## 1. TOML Configuration Infrastructure

- [x] 1.1 Select and add a TOML parsing and lossless-editing solution that preserves unrelated Codex configuration content, comments, and formatting.
- [x] 1.2 Implement focused parsing and replacement helpers for `mcp_servers.<name>` tables, including creation, replacement, deletion, nested server tables, and TOML string/value escaping.
- [x] 1.3 Add unit tests proving unrelated TOML settings and comments remain unchanged across creation, update, and deletion.

## 2. Codex Adapter

- [x] 2.1 Add `src/adapters/codex.ts` with user (`~/.codex/config.toml`) and project (`.codex/config.toml`) default path candidates for supported platforms.
- [x] 2.2 Implement Codex stdio parsing and serialization for `command`, `args`, `cwd`, and `env`.
- [x] 2.3 Implement Codex streamable HTTP parsing and serialization for `url` and `http_headers`.
- [x] 2.4 Preserve Codex-specific server settings as `extra` and re-emit them only when writing through the Codex adapter.
- [x] 2.5 Define and implement safe handling for normalized SSE entries targeted at Codex so the adapter never emits an invalid Codex transport.
- [x] 2.6 Register the Codex adapter and export any new public adapter surfaces.

## 3. Verification

- [x] 3.1 Add Codex adapter tests for default paths, missing files, stdio and HTTP parsing, round trips, Codex-specific field preservation, and surgical TOML updates.
- [x] 3.2 Extend CLI migration and restore tests to cover Codex selection, writing, cleanup, and restoring Codex backup versions.
- [x] 3.3 Run the project test suite, linter, type check, and build; resolve any regressions.

## 4. Documentation

- [x] 4.1 Update README.md and docs/spec.md to reflect any user-facing or architectural changes introduced by this change
