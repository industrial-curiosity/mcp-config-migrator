# Spec: ide-config-adapters

### Requirement: Supported IDE list

The system SHALL support exactly VS Code, Cursor, Claude Code, and Pi as selectable source and target IDEs.

#### Scenario: Selecting source and target

- **WHEN** the user is prompted to choose a source IDE and, separately, a target IDE
- **THEN** the only options offered are VS Code, Cursor, Claude Code, and Pi

### Requirement: Config scope selection

For IDEs that support more than one MCP config scope (VS Code: workspace or user; Cursor: global or project; Claude Code: user or project), the system SHALL ask the user which scope to use before suggesting a path.

#### Scenario: Claude Code scope choice

- **WHEN** the user selects Claude Code as the source or target IDE
- **THEN** the system asks whether to use the user-scope config (`~/.claude.json`) or the project-scope config (`.mcp.json`)

### Requirement: Pi config scope selection

Pi supports four MCP config scopes with defined precedence (later entries override earlier ones): global shared, Pi global override, project shared, and Pi project override. The system SHALL offer all four scopes when Pi is selected, and SHALL display a hint alongside each option describing its precedence and sharing behavior.

#### Scenario: Pi scope options presented

- **WHEN** the user selects Pi as the source or target IDE
- **THEN** the system presents exactly four scope options: Global shared, Pi global override, Project shared, and Pi project override — each with a hint describing its purpose

#### Scenario: Hints describe scope purpose

- **WHEN** the scope selection prompt is shown for Pi
- **THEN** each option's hint includes its resolved path and a brief description (e.g. "shared across all MCP tools" or "Pi-specific; overrides global shared")

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

### Requirement: Pi default path suggestion

For the selected Pi scope, the system SHALL compute the platform-appropriate default config file path and present it as an editable suggestion.

#### Scenario: Pi global shared default path

- **WHEN** the user selects Pi and the "Global shared" scope
- **THEN** the suggested default path is `~/.config/mcp/mcp.json`, shown in an editable prompt

#### Scenario: Pi global override default path

- **WHEN** the user selects Pi and the "Pi global override" scope
- **THEN** the suggested default path is `~/.pi/agent/mcp.json`, shown in an editable prompt

#### Scenario: Pi project shared default path

- **WHEN** the user selects Pi and the "Project shared" scope
- **THEN** the suggested default path is `.mcp.json` relative to the current working directory, shown in an editable prompt

#### Scenario: Pi project override default path

- **WHEN** the user selects Pi and the "Pi project override" scope
- **THEN** the suggested default path is `.pi/mcp.json` relative to the current working directory, shown in an editable prompt

### Requirement: Scope selection hints

The `DefaultPathCandidate` type SHALL support an optional `hint` field. When a hint is present, the scope selection prompt SHALL display the resolved path followed by the hint text. When no hint is provided, the resolved path alone is shown.

#### Scenario: Hint displayed alongside path

- **WHEN** a `DefaultPathCandidate` has a non-empty `hint` field
- **THEN** the scope selection prompt shows the path and the hint together (e.g. `~/.config/mcp/mcp.json · shared across all MCP tools`)

#### Scenario: Path-only display when no hint

- **WHEN** a `DefaultPathCandidate` has no `hint` field
- **THEN** the scope selection prompt shows only the resolved path, matching the existing behavior of all non-Pi adapters

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

### Requirement: Pi normalized config parsing

The system SHALL parse any of the four Pi MCP config files using the `mcpServers` key, following the same normalized representation used for Cursor and Claude Code entries.

#### Scenario: Parsing a Pi stdio entry

- **WHEN** the system reads a Pi MCP config entry under `mcpServers` with a `command` and optional `args`
- **THEN** the normalized representation includes that server's name, stdio transport, command, and args

#### Scenario: Parsing a Pi remote entry

- **WHEN** the system reads a Pi MCP config entry under `mcpServers` with a `url`
- **THEN** the normalized representation includes that server's name, http transport, url, and any headers

#### Scenario: Preserving Pi-specific fields

- **WHEN** a parsed Pi server entry contains Pi-specific fields such as `directTools`
- **THEN** those fields are retained and re-emitted when the entry is serialized back to Pi's config format

### Requirement: Missing config file handling

The system SHALL treat a source or target config file path that does not yet exist as a valid, empty configuration (zero servers) instead of raising an error.

#### Scenario: Target file does not exist

- **WHEN** the user-confirmed target path does not exist on disk
- **THEN** the system proceeds as if the target configuration currently has no servers, rather than failing

### Requirement: Pi target prerequisite notice

Because Pi has no built-in MCP support, the system SHALL display a one-time informational notice when Pi is selected as a migration or restore target, informing the user that `pi-mcp-adapter` must be installed for MCP servers to function in Pi.

#### Scenario: Notice shown when Pi is target

- **WHEN** the user confirms Pi as the target IDE for any flow (migrate, restore)
- **THEN** the system prints a notice stating that `pi-mcp-adapter` must be installed via `pi install npm:pi-mcp-adapter` before MCP servers will work, before proceeding with the write

#### Scenario: Notice not shown when Pi is source only

- **WHEN** the user selects Pi as the **source** IDE only (not target)
- **THEN** no prerequisite notice is displayed

### Requirement: Surgical, round-trip-safe serialization

When writing a normalized configuration back to an IDE's config file, the system SHALL modify only the server-map key relevant to that IDE (`servers` for VS Code, `mcpServers` for Cursor and Claude Code) and SHALL leave all other content in that file unchanged.

#### Scenario: Writing to Claude Code's shared config file

- **WHEN** the system writes a merged configuration to `~/.claude.json`, a file that also stores OAuth session data and per-project trust state
- **THEN** the resulting file retains all pre-existing non-`mcpServers` keys and values unchanged
