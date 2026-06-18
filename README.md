# mcp-config-migrator

Interactively migrate and merge MCP (Model Context Protocol) server configurations between VS Code, Cursor, and Claude Code.

If you configure MCP servers in one editor and want the same servers available in another — or want to keep two editors' configs in sync — this CLI walks you through picking a source and target, shows you what would change, lets you resolve any conflicts, and writes the result back in the target's native format.

## Usage

```sh
npx mcp-config-migrator
```

You'll be asked to:

1. Pick a **source** IDE and config scope/path (a sensible default is suggested and pre-filled, but always editable).
2. Pick a **target** IDE and config scope/path the same way.
3. Review any entries that exist in both configs with different definitions, and choose for each one: accept the source's version or accept the target's version.
4. Confirm a summary (added / unchanged / conflicts resolved) before anything is written.
5. After writing, optionally remove any server entries from the target as a cleanup step.

Nothing is written to disk until you explicitly confirm, and the existing target file (if any) is backed up alongside itself before being overwritten. You can cancel at any prompt (Ctrl+C) with no changes made.

If you migrate into a Claude Code project-scope config (`.mcp.json`), Claude Code will ask you to re-approve the affected servers next time you open that project — the CLI tells you which servers and reminds you of `claude mcp reset-project-choices` if you'd rather not be prompted again.

## Supported IDEs and config scopes

| IDE | Scope | Config key | Default path |
|---|---|---|---|
| VS Code | Workspace | `servers` | `<project>/.vscode/mcp.json` |
| VS Code | User | `servers` | macOS: `~/Library/Application Support/Code/User/mcp.json`; Linux: `$XDG_CONFIG_HOME/Code/User/mcp.json` (falls back to `~/.config/...`); Windows: `%APPDATA%\Code\User\mcp.json` |
| Cursor | Global | `mcpServers` | `~/.cursor/mcp.json` (Windows: `%USERPROFILE%\.cursor\mcp.json`) |
| Cursor | Project | `mcpServers` | `<project>/.cursor/mcp.json` |
| Claude Code | User | `mcpServers` (inside `~/.claude.json`) | `$CLAUDE_CONFIG_DIR/.claude.json` if set, else `~/.claude.json` |
| Claude Code | Project | `mcpServers` (inside `.mcp.json`) | `<project>/.mcp.json` |

Every suggested path is shown as editable text — auto-detection is a convenience, not a requirement.

VS Code requires a `type` (`stdio`/`http`/`sse`) on every entry; Cursor and Claude Code make `type` optional for `stdio` entries. Fields specific to one IDE (e.g. VS Code's `sandbox` options) are preserved when round-tripping through that same IDE, but dropped — with a warning — when migrating to a different IDE, since there's no equivalent field to write them into.

Writes to `~/.claude.json` only touch the `mcpServers` key; OAuth session data, trust state, and any other content in that file is left untouched.

## Example run

```
┌  mcp-config-migrator
◆  Migrate MCP servers FROM which IDE?
│  ● Cursor
◆  Which Cursor config scope?
│  ● Global
◆  Confirm the Cursor config path (Global):
│  ~/.cursor/mcp.json
◆  Migrate MCP servers TO which IDE?
│  ● Claude Code
◆  Which Claude Code config scope?
│  ● Project (.mcp.json)
◆  Confirm the Claude Code config path (Project (.mcp.json)):
│  ./.mcp.json
◆  Migration summary
│  Added (2): fetch, github
│  Unchanged (1): filesystem
│  Conflicts resolved (0):
│    accept target (0)
│    accept source (0)
◆  Write merged config to ./.mcp.json?
│  Yes
✔  Wrote merged config to ./.mcp.json
◆  Remove any MCP servers from the target before finishing? (none required)
│  (none selected)
└  Done.
```

## Development

```sh
npm install
npm run build      # compile to dist/
npm run test       # run the test suite
npm run lint         # lint
npm run typecheck   # type-check without emitting
```
