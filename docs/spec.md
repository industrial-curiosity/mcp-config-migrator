# Architecture

`mcp-config-migrator` is a one-shot interactive CLI (`npx mcp-config-migrator`) that migrates MCP server entries between VS Code, Cursor, and Claude Code config files. There is no daemon, watch mode, or two-way sync — each run reads a source and a target config, lets the user resolve any conflicts, and writes the merged result back to the target.

## Layers

```
src/model/     Normalized representation, equality, backup utility — no IDE-specific knowledge.
src/adapters/  One IdeAdapter per IDE: knows that IDE's file location(s) and on-disk schema.
src/engine/    Classification, diffing, merge application, and summary — IDE-agnostic.
src/cli/       The interactive flow that wires prompts to the engine and adapters.
```

### Normalized model (`src/model/types.ts`)

`NormalizedMcpServer` is the common shape every adapter parses into and serializes from: `name`, `transport` (`stdio` | `http` | `sse`), `command`/`args`/`cwd`/`env` for stdio, `url`/`headers` for remote transports, and an `extra` bag (tagged with the originating IDE's id) for fields that exist in one IDE's schema but not the common shape. `extra` fields are only ever re-emitted when serializing back through the *same* adapter that produced them — cross-IDE migrations drop them and report what was dropped.

`areServersEqual` (in `src/model/equality.ts`) compares only the common fields, deliberately ignoring `extra` — two entries that originated in different IDEs but agree on every shared field are still "Unchanged".

### Adapters (`src/adapters/`)

Each `IdeAdapter` (`src/adapters/types.ts`) implements:

- `resolveDefaultPaths(env, platform, cwd)` — labeled path candidates per scope, computed from the platform and relevant env vars (e.g. `CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME`). These are always presented to the user as editable suggestions, never applied silently.
- `load(path)` — parses the file into a `NormalizedConfig`. A missing file loads as empty rather than erroring.
- `save(path, normalized)` — a **surgical** read-modify-write: only the server-map key (`servers` for VS Code, `mcpServers` for Cursor/Claude Code) is replaced; every other top-level key in the file (e.g. `~/.claude.json`'s OAuth/trust state) is preserved untouched.

VS Code's adapter uses `jsonc-parser` so that comments in `mcp.json` survive a write. Cursor and Claude Code's files are plain JSON. Shared per-entry field-splitting logic (known vs. `extra`) lives in `src/adapters/entryFields.ts`; the adapter registry (`src/adapters/registry.ts`) maps an IDE id to its adapter instance.

### Engine (`src/engine/`)

- `classify.ts` — for each source entry, classifies it relative to the target by name: `add` (target lacks it), `unchanged` (deeply equal), or `conflict` (same name, different definition). Target-only entries aren't classified — they pass through untouched.
- `diff.ts` — renders a `+`/`-` line diff (via the `diff` package) between a conflicting entry's target and source JSON, for display before asking the user to resolve it.
- `merge.ts` — `applyMerge` produces the final config: every `add` entry, every `conflict` per its resolution (`keep-target` / `take-source` / `skip`), every `unchanged` entry, and every target-only entry — all untouched unless explicitly resolved otherwise.
- `summary.ts` — counts for the pre-write summary, and `isNoOp` to detect when a migration would change nothing.
- `write.ts` — `saveWithBackup` wraps an adapter's `save` with a pre-write backup of the existing target file (a timestamped copy beside the original; `null` if there was no existing file to back up).

### CLI (`src/cli/`)

`src/cli/flow.ts` is the entire interactive flow, built on `@clack/prompts`. It is intentionally not split into a separate "IO abstraction" layer — tests mock the `@clack/prompts` module directly (see `src/cli/flow.test.ts`) rather than introducing an extra interface. Any cancellation (Ctrl+C / clack's cancel) anywhere before the write-confirmation prompt aborts with no file writes and no backup; cancelling during the post-write cleanup step just skips cleanup, since the migration write itself already completed and was already confirmed.

`src/cli/index.ts` is the published `bin` entry (`dist/cli.js`, shebang `#!/usr/bin/env node`).

## Non-goals

See `openspec/changes/add-mcp-config-migrator/design.md` for the full list (no Claude Desktop/Windsurf/VSCodium support, no two-way sync, no field-level conflict merge, no non-interactive/CI mode in v1).
