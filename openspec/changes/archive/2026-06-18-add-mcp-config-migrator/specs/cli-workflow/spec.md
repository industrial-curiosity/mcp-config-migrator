# Spec: cli-workflow

## ADDED Requirements

### Requirement: Interactive entry point

Running `npx mcp-config-migrator` SHALL start an interactive CLI session that guides the user through source IDE selection, target IDE selection, config path confirmation for each, conflict resolution, write confirmation, and optional cleanup, in that order.

#### Scenario: Standard run order

- **WHEN** the user runs `npx mcp-config-migrator`
- **THEN** the CLI prompts, in order: source IDE, source scope/path, target IDE, target scope/path, then proceeds to diff and conflict resolution before any file is written

### Requirement: Final write confirmation

Before writing the merged configuration to the target file, the system SHALL show the migration summary and require the user to explicitly confirm before any write occurs.

#### Scenario: User confirms the write

- **WHEN** the user reviews the migration summary and confirms
- **THEN** the system writes the backup and the merged target configuration to disk

#### Scenario: User declines the write

- **WHEN** the user reviews the migration summary and declines to proceed
- **THEN** the system exits without modifying the target file

### Requirement: Cancellation at any prompt

The system SHALL allow the user to abort the session at any prompt (e.g. via Ctrl+C or an explicit cancel action) without writing or modifying any files.

#### Scenario: User cancels mid-flow

- **WHEN** the user cancels the session before reaching the final write confirmation
- **THEN** no target file is modified and no backup is created

### Requirement: No-op detection

If, after classification, the source configuration contributes no additions and no conflicts relative to the target, the system SHALL inform the user that there is nothing to migrate and SHALL skip the write and backup steps.

#### Scenario: Source is a subset of target

- **WHEN** every source server entry is already present and identical in the target
- **THEN** the system reports that there is nothing to migrate and does not write or back up the target file

### Requirement: Claude Code project-scope re-approval notice

When a migration adds or changes project-scoped server entries in a Claude Code target's `.mcp.json`, the system SHALL display a clear notice naming the affected servers and informing the user that Claude Code will ask them to re-approve those servers (mentioning the `claude mcp reset-project-choices` command), rather than writing the file silently.

#### Scenario: New project-scoped servers added to Claude Code

- **WHEN** the merged configuration being written to a Claude Code project-scope target (`.mcp.json`) adds or changes one or more server entries
- **THEN** the system shows a notice listing those server names and explaining that Claude Code will prompt for trust approval again, including the `claude mcp reset-project-choices` command

#### Scenario: No project-scoped changes

- **WHEN** the target is not Claude Code project scope, or no project-scoped entries were added or changed
- **THEN** no re-approval notice is shown

### Requirement: Post-migration cleanup

After a successful migration write, the system SHALL offer the user a multi-select prompt listing all server entries currently in the target configuration, allowing the user to choose entries to remove, and SHALL re-save the target file if any entries were removed.

#### Scenario: User removes entries during cleanup

- **WHEN** the user selects one or more server entries to remove during the post-migration cleanup prompt
- **THEN** the system removes those entries from the target configuration and saves the result

#### Scenario: User skips cleanup

- **WHEN** the user selects no entries during the post-migration cleanup prompt
- **THEN** the target configuration is left as it was immediately after the migration write
