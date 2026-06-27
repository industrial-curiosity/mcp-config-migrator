# mcp-config-migrator

Interactively migrate and merge MCP (Model Context Protocol) server configurations between VS Code, Cursor, Claude Code, and Pi.

If you configure MCP servers in one editor and want the same servers available in another — or want to keep two editors' configs in sync — this CLI walks you through picking a source and target, shows you what would change, lets you resolve any conflicts, and writes the result back in the target's native format.

## Usage

```sh
npx mcp-config-migrator
```

You'll be asked to:

1. Pick a **source** IDE and config scope/path (a sensible default is suggested and pre-filled, but always editable).
2. Pick a **target** IDE and config scope/path the same way.
3. Review any entries that exist in both configs with different definitions, and choose for each one: accept the source's version, accept the target's version, or merge — which opens an editor with both versions combined and conflicting fields marked git-style (`<<<<<<<`/`=======`/`>>>>>>>`) so you can resolve them by hand.
4. Confirm a summary (added / unchanged / conflicts resolved) before anything is written.
5. After writing, optionally remove any server entries from the target as a cleanup step.

Nothing is written to disk until you explicitly confirm. Right before the write, you'll be asked whether to back up the target's *current* MCP server entries (not the rest of the file) to a version history — answer "Yes, always" or "No, never" to stop being asked and remember that choice for future runs, or "Yes"/"No" to decide just this once. Answering "Yes" (either form) also asks where to store the backup, pre-filled with the current default and editable; once a backup is written — including silently, when the preference is "always back up" — its storage location is always displayed. You can cancel at any prompt (Ctrl+C) with no changes made and no backup recorded.

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
| Pi | Global shared | `mcpServers` | `~/.config/mcp/mcp.json` |
| Pi | Pi global override | `mcpServers` | `~/.pi/agent/mcp.json` |
| Pi | Project shared | `mcpServers` | `<project>/.mcp.json` |
| Pi | Pi project override | `mcpServers` | `<project>/.pi/mcp.json` |

Pi config files are loaded in the order listed; later entries override earlier ones. When selecting a Pi scope, each option shows a hint describing its precedence and whether it is shared with other MCP tools.

> **Pi requires `pi-mcp-adapter`** — Pi has no built-in MCP support. Before MCP servers will work, install the adapter: `pi install npm:pi-mcp-adapter` and restart Pi. The CLI will remind you of this when Pi is selected as a target.

Every suggested path is shown as editable text — auto-detection is a convenience, not a requirement.

VS Code requires a `type` (`stdio`/`http`/`sse`) on every entry; Cursor and Claude Code make `type` optional for `stdio` entries. Fields specific to one IDE (e.g. VS Code's `sandbox` options) are preserved when round-tripping through that same IDE, but dropped — with a warning — when migrating to a different IDE, since there's no equivalent field to write them into.

Writes to `~/.claude.json` only touch the `mcpServers` key; OAuth session data, trust state, and any other content in that file is left untouched.

## Backup and restore

Backups (if you opt in) are appended to a single version history file, by default `~/mcp-config-migrator.versions.json`, holding every backed-up version across every target you've ever migrated to — nothing is ever removed or overwritten by normal use.

```sh
npx mcp-config-migrator restore                  # prompts for the version history file, defaulting to the canonical one
npx mcp-config-migrator restore --file <path>    # or -f <path>
npx mcp-config-migrator config backup            # view or change the backup preference and storage location
npx mcp-config-migrator --help                   # or -h, /?
```

`restore` lists every saved version newest-first, lets you preview a version's server entries before committing, and on confirmation writes that version directly back to its original IDE/scope/path — restoring an older version doesn't remove any other version, so you can always restore forward again later.

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
│    merged (0)
◆  Write merged config to ./.mcp.json?
│  Yes
◆  Back up the current MCP servers in ./.mcp.json before writing?
│  ● Yes, always
◆  Backup storage location:
│  ~/mcp-config-migrator.versions.json
✔  Backed up current MCP servers for ./.mcp.json to ~/mcp-config-migrator.versions.json
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
