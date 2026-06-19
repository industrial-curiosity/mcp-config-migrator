## ADDED Requirements

### Requirement: Persisted backup preference

The system SHALL persist a backup preference of exactly one of "always ask", "always back up", or "always skip", defaulting to "always ask" when no preference has been recorded yet, and SHALL read this preference before deciding whether to prompt for a backup decision on a given run.

#### Scenario: No preference recorded yet

- **WHEN** the settings file does not exist or has no recorded preference
- **THEN** the system behaves as though "always ask" were recorded

#### Scenario: Preference previously set to always back up

- **WHEN** the recorded preference is "always back up"
- **THEN** the system backs up the target's current configuration without prompting

#### Scenario: Preference previously set to always skip

- **WHEN** the recorded preference is "always skip"
- **THEN** the system does not back up the target's current configuration and does not prompt

### Requirement: Opt-in backup decision prompt

When the recorded preference is "always ask", after the user confirms the write and before it occurs, the system SHALL prompt with exactly four options in order — "Yes", "Yes, always", "No", "No, never" — with "Yes, always" as the default selection. Only the two "always" choices persist a new preference; plain "Yes" and plain "No" decide this run only and leave the recorded preference at "always ask", so the prompt appears again on the next run.

#### Scenario: User chooses "Yes"

- **WHEN** the user selects "Yes" at the backup decision prompt
- **THEN** the system backs up the target's current configuration for this run, and the recorded preference remains "always ask"

#### Scenario: User chooses "Yes, always"

- **WHEN** the user selects "Yes, always" at the backup decision prompt
- **THEN** the system backs up the target's current configuration for this run and records the preference as "always back up" so future runs do not prompt

#### Scenario: User chooses "No"

- **WHEN** the user selects "No" at the backup decision prompt
- **THEN** the system does not back up the target's current configuration for this run, and the recorded preference remains "always ask"

#### Scenario: User chooses "No, never"

- **WHEN** the user selects "No, never" at the backup decision prompt
- **THEN** the system does not back up the target's current configuration for this run and records the preference as "always skip" so future runs do not prompt

### Requirement: Config-only, versioned backup storage

When a backup occurs, the system SHALL append an entry containing the target's current MCP server entries (not the rest of the target file), the originating IDE, scope, and path, and a timestamp, to an append-only version history, without removing or overwriting any existing entry.

#### Scenario: First backup creates the history

- **WHEN** a backup occurs and no version history file exists yet
- **THEN** the system creates one containing exactly the new entry

#### Scenario: Subsequent backup appends

- **WHEN** a backup occurs and a version history file already exists
- **THEN** the system adds the new entry to the existing history without altering or removing any prior entry

### Requirement: Settings and storage location

The system SHALL persist the backup preference and the version history's storage location in a single settings file at `~/mcp-config-migrator.versions.json` by default, and SHALL allow the version history itself to be relocated to a different file via a recorded storage location, with the version history living in the settings file when no other location is recorded.

#### Scenario: No custom location recorded

- **WHEN** the settings file has no recorded storage location
- **THEN** the version history is read from and written to the settings file itself

#### Scenario: Custom location recorded

- **WHEN** the settings file has a recorded storage location pointing to a different file
- **THEN** the version history is read from and written to that file instead of the settings file

### Requirement: Restore command

The system SHALL provide a `restore` command that reads the version history (from `--file`/`-f <path>` if given, otherwise from a path the user confirms with the resolved storage location as the default), lists every entry across all targets ordered from newest to oldest with its timestamp, originating IDE, scope, and path, lets the user preview a selected entry's server contents, and on confirmation writes that entry's servers directly to its originating IDE/scope/path, without modifying the version history.

#### Scenario: Listing and previewing versions

- **WHEN** the user runs the restore command
- **THEN** the system lists every recorded version newest-first with its timestamp, IDE, scope, and path, and shows the selected version's server contents before asking for confirmation

#### Scenario: Restoring a selected version

- **WHEN** the user confirms restoring a selected version
- **THEN** the system writes that version's server entries to its recorded path using its recorded IDE's adapter, and the version history is unchanged afterward

#### Scenario: Restoring after a prior restore

- **WHEN** the user restores an older version after having already restored a different version in an earlier run
- **THEN** every previously recorded version, including the one just replaced, remains available to select again

### Requirement: Config backup command

The system SHALL provide a `config backup` command that shows the currently recorded backup preference and storage location, and lets the user change either, independent of running a migration.

#### Scenario: Viewing and changing the preference

- **WHEN** the user runs `config backup`
- **THEN** the system shows the current preference and storage location and lets the user select a new preference

#### Scenario: Changing the storage location

- **WHEN** the user changes the storage location via `config backup` to a non-default path
- **THEN** the system records that path as the storage location, and future backups and restores use it instead of the settings file

### Requirement: Command-line help

The system SHALL print a list of available commands when invoked with `--help`, `-h`, or `/?`.

#### Scenario: Requesting help

- **WHEN** the user runs the CLI with `--help`, `-h`, or `/?`
- **THEN** the system prints the available commands instead of starting any interactive flow
