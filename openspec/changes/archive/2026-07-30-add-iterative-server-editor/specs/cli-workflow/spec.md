# Spec Delta: CLI Workflow

## ADDED Requirements

### Requirement: Iterative server management before migration write

The system SHALL use the iterative server-management menu after conflict resolution and before the migration summary. It SHALL apply all resulting edits and deletions to the configuration displayed in the summary and saved after confirmation.

#### Scenario: Migration summary includes managed servers

- **WHEN** the user edits or deletes one or more servers in the pre-summary management menu
- **THEN** the migration summary reflects the resulting configuration before the user is asked to confirm the write

## MODIFIED Requirements

### Requirement: Interactive entry point

Running `npx mcp-config-migrator` SHALL start an interactive CLI session that guides the user through source IDE selection, target IDE selection, config path confirmation for each, conflict resolution, an optional iterative pre-summary server-management step, and write confirmation, in that order.

#### Scenario: Standard run order

- **WHEN** the user runs `npx mcp-config-migrator`
- **THEN** the CLI prompts, in order: source IDE, source scope/path, target IDE, target scope/path, conflict resolution (if any conflicts exist), then the optional iterative pre-summary server-management step, then the migration summary and write confirmation before any file is written

## REMOVED Requirements

### Requirement: Post-migration cleanup

**Reason**: The pre-write iterative server-management menu provides deletion before the migration summary and confirmation, making the separate post-write cleanup prompt redundant.

**Migration**: Delete a server from the pre-summary management menu by selecting it and clearing the editor content before finishing the menu.
