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

The system SHALL keep direct-edit changes in memory until it presents an edit/delete summary and the user explicitly confirms the write. After confirmation, it SHALL apply the configured backup policy and save through the selected adapter.

#### Scenario: User confirms direct edits

- **WHEN** the user completes server management and confirms the direct-edit summary
- **THEN** the system backs up the selected configuration according to the existing backup policy and saves the final server configuration through its adapter

#### Scenario: User declines direct edits

- **WHEN** the user declines the direct-edit write confirmation
- **THEN** the selected configuration file is not modified and no backup is recorded

### Requirement: Direct edit cancellation

The system SHALL allow the user to cancel direct editing before write confirmation without modifying the selected configuration or recording a backup.

#### Scenario: User cancels direct editing

- **WHEN** the user cancels at an IDE, scope, path, or server-management prompt
- **THEN** the selected configuration file is not modified and no backup is recorded
