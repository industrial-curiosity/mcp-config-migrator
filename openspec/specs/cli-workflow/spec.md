# CLI Workflow

## Purpose

Define interactive migration and direct-edit workflows for MCP configuration files.

## Requirements

### Requirement: Interactive entry point

Running `npx mcp-config-migrator` SHALL start an interactive CLI session that guides the user through source IDE selection, target IDE selection, config path confirmation for each, conflict resolution, an optional iterative pre-summary server-management step, and write confirmation, in that order.

#### Scenario: Standard run order

- **WHEN** the user runs `npx mcp-config-migrator`
- **THEN** the CLI prompts, in order: source IDE, source scope/path, target IDE, target scope/path, conflict resolution (if any conflicts exist), then the optional iterative pre-summary server-management step, then the migration summary and write confirmation before any file is written

### Requirement: Final write confirmation

Before writing the merged configuration to the target file, the system SHALL show the migration summary and require the user to explicitly confirm before any write occurs. Backing up the target's current configuration is a separate, conditional step (governed by the `backup-and-restore` capability) that occurs after this confirmation and before the write, and is not an automatic or unconditional part of the write itself.

#### Scenario: User confirms the write

- **WHEN** the user reviews the migration summary and confirms
- **THEN** the system proceeds to the backup decision step and then writes the merged target configuration to disk

#### Scenario: User declines the write

- **WHEN** the user reviews the migration summary and declines to proceed
- **THEN** the system exits without modifying the target file and without prompting for a backup

### Requirement: Cancellation at any prompt

The system SHALL allow the user to abort the session at any prompt (e.g. via Ctrl+C or an explicit cancel action) without writing or modifying any files.

#### Scenario: User cancels mid-flow

- **WHEN** the user cancels the session before reaching the final write confirmation
- **THEN** no target file is modified and no backup is recorded

### Requirement: No-op detection

If, after classification, the source configuration contributes no additions and no conflicts relative to the target, the system SHALL inform the user that there is nothing to migrate and SHALL skip the write and backup decision steps.

#### Scenario: Source is a subset of target

- **WHEN** every source server entry is already present and identical in the target
- **THEN** the system reports that there is nothing to migrate and does not write the target file or prompt for a backup

### Requirement: Claude Code project-scope re-approval notice

When a migration adds or changes project-scoped server entries in a Claude Code target's `.mcp.json`, the system SHALL display a clear notice naming the affected servers and informing the user that Claude Code will ask them to re-approve those servers (mentioning the `claude mcp reset-project-choices` command), rather than writing the file silently.

#### Scenario: New project-scoped servers added to Claude Code

- **WHEN** the merged configuration being written to a Claude Code project-scope target (`.mcp.json`) adds or changes one or more server entries
- **THEN** the system shows a notice listing those server names and explaining that Claude Code will prompt for trust approval again, including the `claude mcp reset-project-choices` command

#### Scenario: No project-scoped changes

- **WHEN** the target is not Claude Code project scope, or no project-scoped entries were added or changed
- **THEN** no re-approval notice is shown

### Requirement: Iterative server management before migration write

The system SHALL use the iterative server-management menu after conflict resolution and before the migration summary. It SHALL apply all resulting edits and deletions to the configuration displayed in the summary and saved after confirmation.

#### Scenario: Migration summary includes managed servers

- **WHEN** the user edits or deletes one or more servers in the pre-summary management menu
- **THEN** the migration summary reflects the resulting configuration before the user is asked to confirm the write
