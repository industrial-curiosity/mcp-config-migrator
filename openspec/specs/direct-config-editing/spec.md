# Direct Config Editing

## Purpose

Define direct interactive editing of MCP servers in one selected IDE configuration.

## Requirements

### Requirement: Direct configuration editing command

The system SHALL provide `mcp-config-migrator edit` as an interactive command that prompts for one IDE, its scope, and an editable configuration path, then loads that configuration for server management.

#### Scenario: User starts direct editing

- **WHEN** the user runs `mcp-config-migrator edit`
- **THEN** the system prompts for an IDE, its scope when applicable, and the editable path before loading the selected configuration

### Requirement: Direct edit review and write

The system SHALL keep direct-edit changes in memory until it presents an add/edit/delete summary and the user explicitly confirms the write. After confirmation, it SHALL apply the configured backup policy and save through the selected adapter.

#### Scenario: User confirms direct edits

- **WHEN** the user completes server management and confirms the direct-edit summary
- **THEN** the system backs up the selected configuration according to the existing backup policy and saves the final server configuration through its adapter

#### Scenario: User declines direct edits

- **WHEN** the user declines the direct-edit write confirmation
- **THEN** the selected configuration file is not modified and no backup is recorded

### Requirement: Direct server creation

The direct-edit server-management menu SHALL offer **Add a server** immediately above **Finish editing**, including when the selected configuration has no servers. On selection, the system SHALL prompt for a non-empty server name that does not already exist in the in-memory configuration, then prompt for a transport of `stdio`, `http`, or `sse`, and then open the normalized-JSON editor with a template for that transport. The system SHALL add the valid edited definition to the in-memory configuration and return to the updated menu. It SHALL not require a non-empty command or URL during this creation flow beyond the existing normalized JSON validation.

#### Scenario: User adds a server to an empty configuration

- **WHEN** the selected configuration has no servers and the user chooses **Add a server**, supplies a unique name and a transport, and saves a valid template-derived definition
- **THEN** the new server is shown in the server-management menu and is included in the configuration presented for write confirmation

#### Scenario: User attempts to use an existing server name

- **WHEN** the user enters a name that is already present in the in-memory configuration
- **THEN** the system rejects the name and does not open the transport prompt or editor until the user supplies a unique name

#### Scenario: Direct-edit summary includes a created server

- **WHEN** the user creates a server and reaches direct-edit review
- **THEN** the edit summary lists the server under **Added**

### Requirement: Direct edit cancellation

The system SHALL allow the user to cancel direct editing before write confirmation without modifying the selected configuration or recording a backup.

#### Scenario: User cancels direct editing

- **WHEN** the user cancels at an IDE, scope, path, or server-management prompt
- **THEN** the selected configuration file is not modified and no backup is recorded
