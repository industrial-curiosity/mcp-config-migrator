## MODIFIED Requirements

### Requirement: Supported IDE list

The system SHALL support exactly VS Code, Cursor, Claude Code, and Pi as selectable source and target IDEs.

#### Scenario: Selecting source and target

- **WHEN** the user is prompted to choose a source IDE and, separately, a target IDE
- **THEN** the only options offered are VS Code, Cursor, Claude Code, and Pi

## ADDED Requirements

### Requirement: Pi config scope selection

Pi supports a global MCP config scope and a project-local scope. The system SHALL ask the user which scope to use before suggesting a path when Pi is selected.

#### Scenario: Pi global scope choice

- **WHEN** the user selects Pi as the source or target IDE
- **THEN** the system asks whether to use the global config (`~/.pi/agent/mcp.json`) or the project-local config (`.pi/mcp.json`)

### Requirement: Pi default path suggestion

For the selected Pi scope, the system SHALL compute the platform-appropriate default config file path and present it as an editable suggestion.

#### Scenario: Pi global default path

- **WHEN** the user selects Pi and the global scope
- **THEN** the suggested default path is `~/.pi/agent/mcp.json`, shown in an editable prompt

#### Scenario: Pi project-local default path

- **WHEN** the user selects Pi and the project-local scope
- **THEN** the suggested default path is `.pi/mcp.json` relative to the current working directory, shown in an editable prompt

### Requirement: Pi target prerequisite notice

Because Pi has no built-in MCP support, the system SHALL display a one-time informational notice when Pi is selected as a migration or restore target, informing the user that `pi-mcp-adapter` must be installed for MCP servers to function in Pi.

#### Scenario: Notice shown when Pi is target

- **WHEN** the user confirms Pi as the target IDE for any flow (migrate, restore)
- **THEN** the system prints a notice stating that `pi-mcp-adapter` must be installed via `pi install npm:pi-mcp-adapter` before MCP servers will work, before proceeding with the write

#### Scenario: Notice not shown when Pi is source only

- **WHEN** the user selects Pi as the **source** IDE only (not target)
- **THEN** no prerequisite notice is displayed

### Requirement: Pi normalized config parsing

The system SHALL parse Pi's `~/.pi/agent/mcp.json` or `.pi/mcp.json` file using the `mcpServers` key, following the same normalized representation used for Cursor and Claude Code entries.

#### Scenario: Parsing a Pi stdio entry

- **WHEN** the system reads a Pi MCP config entry under `mcpServers` with a `command` and optional `args`
- **THEN** the normalized representation includes that server's name, stdio transport, command, and args

#### Scenario: Parsing a Pi remote entry

- **WHEN** the system reads a Pi MCP config entry under `mcpServers` with a `url`
- **THEN** the normalized representation includes that server's name, http transport, url, and any headers

#### Scenario: Preserving Pi-specific fields

- **WHEN** a parsed Pi server entry contains Pi-specific fields such as `directTools`
- **THEN** those fields are retained and re-emitted when the entry is serialized back to Pi's config format
