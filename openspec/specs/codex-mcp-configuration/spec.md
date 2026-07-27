# Spec: codex-mcp-configuration

## Purpose

Define migration and merge behavior for MCP server configurations stored in Codex TOML configuration files.

## Requirements

### Requirement: Codex configuration scopes

The system SHALL offer Codex as a selectable source and target with user and project scopes. The user-scope default path SHALL be `~/.codex/config.toml`, and the project-scope default path SHALL be `.codex/config.toml` relative to the current working directory; both paths SHALL remain editable before use.

#### Scenario: Codex scope choice

- **WHEN** the user selects Codex as a source or target
- **THEN** the system asks the user to select either User or Project scope and presents the matching default path as an editable suggestion

### Requirement: Codex MCP entry parsing

The system SHALL parse every table under `mcp_servers.<name>` in a Codex TOML configuration file into the normalized MCP representation. A table with `command` SHALL be represented as a stdio server, and a table with `url` SHALL be represented as an HTTP server.

#### Scenario: Parsing a Codex stdio server

- **WHEN** the system reads a Codex server table with `command`, `args`, `cwd`, and `env`
- **THEN** the normalized server contains the same name, stdio transport, command, arguments, working directory, and environment values

#### Scenario: Parsing a Codex HTTP server

- **WHEN** the system reads a Codex server table with `url` and `http_headers`
- **THEN** the normalized server contains the same name, HTTP transport, URL, and headers

### Requirement: Codex-specific field preservation

The system SHALL retain Codex server fields outside the shared normalized representation as Codex-specific fields. It SHALL re-emit them when writing through Codex and SHALL report them as dropped when writing the same server through another client adapter.

#### Scenario: Round-tripping Codex-specific server settings

- **WHEN** a Codex server has a Codex-specific setting such as `bearer_token_env_var`, `enabled_tools`, `default_tools_approval_mode`, or `startup_timeout_sec`
- **THEN** loading and saving the server through Codex retains that setting

#### Scenario: Migrating Codex-specific settings to another client

- **WHEN** a Codex server with Codex-specific settings is migrated to a different target client
- **THEN** the system writes the shared server fields and warns that the Codex-specific fields were dropped

### Requirement: Surgical Codex configuration updates

The system SHALL update only Codex MCP server configuration when saving to a Codex config file and SHALL preserve unrelated TOML configuration content, comments, and formatting.

#### Scenario: Updating a user Codex configuration

- **WHEN** the system writes merged servers to a Codex configuration containing unrelated settings and comments
- **THEN** only the affected `mcp_servers` tables change and all unrelated content remains unchanged

#### Scenario: Removing a Codex server

- **WHEN** the user removes a server during the post-write cleanup step for a Codex target
- **THEN** the corresponding `mcp_servers.<name>` table is removed without modifying unrelated configuration content

### Requirement: Missing Codex configuration file handling

The system SHALL treat a selected Codex configuration file that does not exist as an empty configuration and SHALL create the required directory and configuration file when the user confirms a write.

#### Scenario: Writing a new project Codex configuration

- **WHEN** the user selects a nonexistent `.codex/config.toml` file as a Codex target and confirms a migration
- **THEN** the system creates the `.codex` directory and writes the selected MCP server tables
