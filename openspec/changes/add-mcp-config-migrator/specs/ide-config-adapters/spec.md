## ADDED Requirements

### Requirement: Supported IDE list
The system SHALL support exactly VS Code, Cursor, and Claude Code as selectable source and target IDEs.

#### Scenario: Selecting source and target
- **WHEN** the user is prompted to choose a source IDE and, separately, a target IDE
- **THEN** the only options offered are VS Code, Cursor, and Claude Code

### Requirement: Config scope selection
For IDEs that support more than one MCP config scope (VS Code: workspace or user; Cursor: global or project; Claude Code: user or project), the system SHALL ask the user which scope to use before suggesting a path.

#### Scenario: Claude Code scope choice
- **WHEN** the user selects Claude Code as the source or target IDE
- **THEN** the system asks whether to use the user-scope config (`~/.claude.json`) or the project-scope config (`.mcp.json`)

### Requirement: Default path suggestion
For the selected IDE and scope, the system SHALL compute a platform-appropriate default config file path, taking into account relevant environment variable overrides, and present it as an editable suggestion rather than using it automatically.

#### Scenario: Claude Code default with CLAUDE_CONFIG_DIR set
- **WHEN** the user selects Claude Code user scope and the `CLAUDE_CONFIG_DIR` environment variable is set
- **THEN** the suggested default path is `$CLAUDE_CONFIG_DIR/.claude.json`, shown in an editable prompt

#### Scenario: Claude Code default without CLAUDE_CONFIG_DIR
- **WHEN** the user selects Claude Code user scope and `CLAUDE_CONFIG_DIR` is not set
- **THEN** the suggested default path is `~/.claude.json`, shown in an editable prompt

#### Scenario: VS Code default per operating system
- **WHEN** the user selects VS Code user scope
- **THEN** the suggested default path matches the current OS convention (e.g. `~/Library/Application Support/Code/User/mcp.json` on macOS, `~/.config/Code/User/mcp.json` on Linux, `%APPDATA%\Code\User\mcp.json` on Windows), shown in an editable prompt

#### Scenario: User overrides the suggested path
- **WHEN** the user edits or replaces a suggested default path before confirming
- **THEN** the system uses the user-provided path instead of the computed default

### Requirement: Normalized config parsing
The system SHALL parse a given IDE's MCP config file into a normalized in-memory representation capturing, per server entry: name, transport (stdio, http, or sse), command/args/env (for stdio) or url/headers (for remote), and any fields not common across IDEs, without data loss.

#### Scenario: Parsing a VS Code stdio entry
- **WHEN** the system reads a VS Code `mcp.json` entry under `servers` with `type: "stdio"`, `command`, and `args`
- **THEN** the normalized representation includes that server's name, stdio transport, command, and args

#### Scenario: Parsing a Cursor or Claude Code remote entry
- **WHEN** the system reads a `mcpServers` entry with `type: "http"` or `type: "sse"` and a `url`
- **THEN** the normalized representation includes that server's name, the matching transport, and the url and headers

#### Scenario: Preserving unrecognized fields
- **WHEN** a parsed server entry contains fields not part of the common normalized shape (e.g. `oauth`, `envFile`, `sandboxEnabled`)
- **THEN** those fields are retained and are re-emitted if the entry is later serialized back to the same IDE's schema

### Requirement: Missing config file handling
The system SHALL treat a source or target config file path that does not yet exist as a valid, empty configuration (zero servers) instead of raising an error.

#### Scenario: Target file does not exist
- **WHEN** the user-confirmed target path does not exist on disk
- **THEN** the system proceeds as if the target configuration currently has no servers, rather than failing

### Requirement: Surgical, round-trip-safe serialization
When writing a normalized configuration back to an IDE's config file, the system SHALL modify only the server-map key relevant to that IDE (`servers` for VS Code, `mcpServers` for Cursor and Claude Code) and SHALL leave all other content in that file unchanged.

#### Scenario: Writing to Claude Code's shared config file
- **WHEN** the system writes a merged configuration to `~/.claude.json`, a file that also stores OAuth session data and per-project trust state
- **THEN** the resulting file retains all pre-existing non-`mcpServers` keys and values unchanged
