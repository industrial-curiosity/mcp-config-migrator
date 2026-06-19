## MODIFIED Requirements

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
