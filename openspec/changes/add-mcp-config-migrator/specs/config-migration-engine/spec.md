# Spec: config-migration-engine

## ADDED Requirements

### Requirement: Entry classification

The system SHALL classify each server entry in the normalized source configuration, relative to the normalized target configuration, as exactly one of: Add (name not present in target), Unchanged (name present with an identical definition), or Conflict (name present with a different definition).

#### Scenario: New server in source only

- **WHEN** a server name exists in the source configuration but not in the target configuration
- **THEN** the entry is classified as Add

#### Scenario: Identical server in both

- **WHEN** a server name exists in both configurations with deeply equal normalized definitions
- **THEN** the entry is classified as Unchanged and is not shown to the user for resolution

#### Scenario: Differing server in both

- **WHEN** a server name exists in both configurations with different normalized definitions
- **THEN** the entry is classified as Conflict

### Requirement: Conflict diff display

For each entry classified as Conflict, the system SHALL display a diff between the source and target definitions before asking the user to resolve it.

#### Scenario: Displaying a conflict

- **WHEN** the system presents a Conflict entry to the user
- **THEN** it shows the differing fields between the source and target versions of that server entry before prompting for a resolution choice

### Requirement: Conflict resolution choice

For each Conflict entry, the system SHALL let the user choose exactly one of: keep the target's existing definition, take the source's definition, or skip (leave the target unchanged for this entry).

#### Scenario: User takes the source version

- **WHEN** the user chooses "take source" for a conflicting entry
- **THEN** the merged configuration uses the source's definition for that server name

#### Scenario: User keeps the target version

- **WHEN** the user chooses "keep target" or "skip" for a conflicting entry
- **THEN** the merged configuration retains the target's existing definition for that server name unchanged

### Requirement: Merge application

The system SHALL produce a merged configuration containing: every Add entry from the source, every Conflict entry per the user's resolution choice, every Unchanged entry as-is, and every server entry that exists only in the target, untouched.

#### Scenario: Target-only entries survive migration

- **WHEN** the target configuration contains a server not present in the source configuration
- **THEN** that server remains in the merged configuration after migration

### Requirement: Pre-write backup

Before overwriting an existing target config file, the system SHALL save a backup copy of that file's current contents.

#### Scenario: Backup created before write

- **WHEN** the system is about to write a merged configuration to a target file that already exists
- **THEN** a backup of the pre-migration file contents is saved before the write occurs

### Requirement: Migration summary

After applying a merge, the system SHALL report the number of entries added, the number of conflicts resolved broken down by the choice made for each, and the number of entries left unchanged.

#### Scenario: Summary after a migration with conflicts

- **WHEN** a migration includes additions, conflicts, and unchanged entries
- **THEN** the system reports counts for each category, including how each conflict was resolved
