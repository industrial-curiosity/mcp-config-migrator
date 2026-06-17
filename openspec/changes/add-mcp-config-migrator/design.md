## Context

MCP server configuration is stored differently by each target IDE, both in *location* and in *schema*. Research findings (current as of June 2026):

| IDE | Config key | File(s) | Default location |
|---|---|---|---|
| VS Code | `servers` (requires `type: stdio\|http\|sse` on every entry) | Workspace: `.vscode/mcp.json`. User: `mcp.json` in the user profile folder | macOS: `~/Library/Application Support/Code/User/mcp.json`; Linux: `~/.config/Code/User/mcp.json` (respects `XDG_CONFIG_HOME`); Windows: `%APPDATA%\Code\User\mcp.json` |
| Cursor | `mcpServers` (stdio entries omit `type`; remote entries use `type: http\|sse` + `url`) | Global: `~/.cursor/mcp.json`. Project: `<project>/.cursor/mcp.json` (wins on conflict with global) | macOS/Linux: `~/.cursor/mcp.json`; Windows: `%USERPROFILE%\.cursor\mcp.json` |
| Claude Code | `mcpServers` (same entry shape as Cursor) | User scope: `~/.claude.json` (a file that *also* holds OAuth session, per-project trust state, and caches — not exclusively MCP config). Project scope: `<project>/.mcp.json` | Default `~/.claude.json`; when the (undocumented but widely used) `CLAUDE_CONFIG_DIR` env var is set, Anthropic's CLI itself writes to `$CLAUDE_CONFIG_DIR/.claude.json` instead |

Key implications:
- VS Code's top-level key (`servers`) and required `type` field differ from Cursor/Claude Code's (`mcpServers`, optional `type` for stdio). A normalized intermediate model is needed to migrate between them without 6 bespoke pairwise converters.
- `~/.claude.json` is **not** an MCP-only file — a naive overwrite would destroy unrelated user state (OAuth tokens, trust settings). Any write must surgically replace only the `mcpServers` key.
- `CLAUDE_CONFIG_DIR` behavior is confirmed by community bug reports (e.g. anthropics/claude-code#3833) but not by official docs, so the computed default must be treated as a suggestion the user can override, not a guarantee.
- VS Code's `mcp.json` may use JSONC-style comments (consistent with VS Code's other config files); a plain `JSON.parse`/`JSON.stringify` round-trip would silently delete them.

## Goals / Non-Goals

**Goals:**
- Provide one normalized in-memory model that all three IDE adapters parse into and serialize from.
- Preserve everything in the target file that migration didn't touch (formatting where feasible, and all unrelated JSON keys always).
- Never write to disk without an explicit user confirmation step, and keep a backup of the file that was overwritten.
- Make every suggested file path/IDE default editable before use — auto-detection is a convenience, not a requirement.

**Non-Goals:**
- Supporting VS Code Insiders/VSCodium, Claude Desktop (a different product from Claude Code), Windsurf, or other MCP-capable editors in v1.
- Two-way sync or a watch/daemon mode — this is a one-shot interactive run.
- Field-level merging within a single conflicting server entry — conflict resolution is whole-entry (keep target / take source / skip).
- Reading/writing Claude Code's "local" scope, which lives as per-project nested state inside `~/.claude.json` rather than under the top-level `mcpServers` key. Only top-level user scope (`~/.claude.json`) and project scope (`.mcp.json`) are supported.
- A non-interactive/CI flag-driven mode (may follow later; see Open Questions).

## Decisions

1. **TypeScript → ESM, Node ≥ 18, published as a `bin` package.** Standard for a modern `npx`-invoked CLI; avoids CJS/ESM interop friction with current prompt libraries.

2. **Adapter pattern with one normalized model**, instead of pairwise converters. Each IDE gets one `IdeAdapter` that implements `load()` (parse file → `NormalizedConfig` + retain the original parsed document) and `save()` (merge edited `NormalizedConfig` back into the original document, replacing only the server-map key). This scales to O(n) adapters instead of O(n²) converters and keeps schema-difference handling (key name, mandatory vs optional `type`) localized to one file per IDE.

3. **Surgical read-modify-write, not blind overwrite.** `save()` takes the original parsed document and only replaces the `servers`/`mcpServers` key, so unrelated content in files like `~/.claude.json` (OAuth session, trust state) survives untouched. Considered blind overwrite (simpler) but rejected — too risky given `~/.claude.json` is a shared, multi-purpose file.

4. **`jsonc-parser` for VS Code's adapter; strict `JSON.parse` for Cursor/Claude Code.** VS Code config files may contain comments; Cursor and Claude Code's files are plain JSON. Using a JSONC-aware parser only where needed avoids over-engineering the common case.

5. **Whole-entry conflict resolution**, not field-level merge. When a server name exists in both source and target with different definitions, the user is shown a line diff (via the `diff` package, pretty-printed JSON per entry) and picks one of: keep target, take source, or skip. Field-level merge was considered and deferred — it adds significant UI complexity for a case (partial overlap of one server's settings) that's rare in practice.

6. **Always-editable, platform/env-aware default path suggestions.** Each adapter exposes `resolveDefaultPaths()` returning labeled candidates (e.g. "User", "Project (.mcp.json)") computed from `process.platform` and relevant env vars (only `CLAUDE_CONFIG_DIR` is known to apply). The CLI pre-fills these into an editable text prompt — it never reads or writes a path the user didn't see and confirm.

7. **Pre-write backup + final confirmation.** Before saving, the CLI writes a timestamped backup of the existing target file (if any) alongside it, and shows a final summary (counts of added/conflicts-resolved/skipped) before committing the write. This is the safety net for the inherent risk of mutating a file another running IDE may also depend on.

8. **Prompt library: `@clack/prompts`.** Chosen over `inquirer` (heavier dependency, older callback-oriented API) and bare `prompts` (less polished cancel/abort handling) for a modern, lightweight interactive experience consistent with current CLI tooling norms.

## Risks / Trade-offs

- **[Risk]** `CLAUDE_CONFIG_DIR` redirection behavior is undocumented by Anthropic and only confirmed via community bug reports → **Mitigation**: treat the computed path as a suggestion in an editable prompt; never assume it's correct.
- **[Risk]** A bug in adapter serialization could corrupt unrelated content in a shared file like `~/.claude.json` → **Mitigation**: surgical key-only replacement, pre-write backup, and a final confirmation step showing what will change.
- **[Risk]** Stripping comments from a VS Code `mcp.json` that uses JSONC syntax → **Mitigation**: use `jsonc-parser` for that adapter specifically; document as best-effort if exotic JSONC features aren't preserved.
- **[Risk]** Auto-detected default paths can be wrong for non-standard installs (portable VS Code, WSL, custom `XDG_CONFIG_HOME`) → **Mitigation**: defaults are always shown as editable, never auto-applied silently.
- **[Risk]** Cross-IDE migration of fields with no equivalent on the target (e.g. VS Code's `sandbox` block) → **Mitigation**: unrecognized fields are kept in an adapter-specific `extra` bag and only re-emitted when round-tripping through the *same* IDE type; cross-IDE migrations drop them and the CLI prints a warning listing what was dropped per entry.

## Open Questions

- Should a future version support migrating across all three IDEs in one run (not just a single source→target pair)?
- Should we add a non-interactive/CI mode driven by flags instead of prompts?
- When new project-scoped servers are added to Claude Code's `.mcp.json`, should the CLI warn the user they'll need to re-approve them (`claude mcp reset-project-choices`) since Claude Code prompts for trust on project-scoped servers?
