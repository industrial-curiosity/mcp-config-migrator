## MODIFIED Requirements

### Requirement: Supported IDE list

The system SHALL support exactly VS Code, Cursor, Claude Code, and Pi as selectable source and target IDEs.

#### Scenario: Selecting source and target

- **WHEN** the user is prompted to choose a source IDE and, separately, a target IDE
- **THEN** the only options offered are VS Code, Cursor, Claude Code, and Pi

### Requirement: Pi config scope selection

Pi supports four MCP config scopes with defined precedence (later entries override earlier ones): global shared, Pi global override, project shared, and Pi project override. The system SHALL offer all four scopes when Pi is selected, and SHALL display a hint alongside each option describing its precedence and sharing behavior.

#### Scenario: Pi scope options presented

- **WHEN** the user selects Pi as the source or target IDE
- **THEN** the system presents exactly four scope options: Global shared, Pi global override, Project shared, and Pi project override — each with a hint describing its purpose

#### Scenario: Hints describe scope purpose

- **WHEN** the scope selection prompt is shown for Pi
- **THEN** each option's hint includes its resolved path and a brief description (e.g. "shared across all MCP tools" or "Pi-specific; overrides global shared")

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

## ADDED Requirements

### Requirement: Pi target prerequisite notice

Because Pi has no built-in MCP support, the system SHALL display a one-time informational notice when Pi is selected as a migration or restore target, informing the user that `pi-mcp-adapter` must be installed for MCP servers to function in Pi.

#### Scenario: Notice shown when Pi is target

- **WHEN** the user confirms Pi as the target IDE for any flow (migrate, restore)
- **THEN** the system prints a notice stating that `pi-mcp-adapter` must be installed via `pi install npm:pi-mcp-adapter` before MCP servers will work, before proceeding with the write

#### Scenario: Notice not shown when Pi is source only

- **WHEN** the user selects Pi as the **source** IDE only (not target)
- **THEN** no prerequisite notice is displayed

### Requirement: Scope selection hints

The `DefaultPathCandidate` type SHALL support an optional `hint` field. When a hint is present, the scope selection prompt SHALL display the resolved path followed by the hint text. When no hint is provided, the resolved path alone is shown.

#### Scenario: Hint displayed alongside path

- **WHEN** a `DefaultPathCandidate` has a non-empty `hint` field
- **THEN** the scope selection prompt shows the path and the hint together (e.g. `~/.config/mcp/mcp.json · shared across all MCP tools`)

#### Scenario: Path-only display when no hint

- **WHEN** a `DefaultPathCandidate` has no `hint` field
- **THEN** the scope selection prompt shows only the resolved path, matching the existing behavior of all non-Pi adapters

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
