## MODIFIED Requirements

### Requirement: Conflict resolution choice

For each Conflict entry, the system SHALL let the user choose exactly one of: accept the source's definition, accept the target's existing definition, or merge the two definitions interactively.

#### Scenario: User accepts the source version

- **WHEN** the user chooses "accept source" for a conflicting entry
- **THEN** the merged configuration uses the source's definition for that server name

#### Scenario: User accepts the target version

- **WHEN** the user chooses "accept target" for a conflicting entry
- **THEN** the merged configuration retains the target's existing definition for that server name unchanged

#### Scenario: User merges the conflicting entry

- **WHEN** the user chooses "merge" for a conflicting entry and the conflict merge editor produces a valid combined definition
- **THEN** the merged configuration uses that combined definition for that server name, rather than either side's original definition

### Requirement: Migration summary

After applying a merge, the system SHALL report, for each of added, unchanged, and conflicting entries, both the count and the server names in that category, with conflicts further broken down by the resolution choice made for each, including how many were resolved by merging.

#### Scenario: Summary after a migration with conflicts

- **WHEN** a migration includes additions, conflicts, and unchanged entries
- **THEN** the system reports the count and server names for each category, including how each conflict was resolved

#### Scenario: Summary after a migration with a merged conflict

- **WHEN** a migration includes a conflict resolved by merging
- **THEN** the system reports that entry's server name under a merged-resolution category, distinct from accept-source and accept-target

## ADDED Requirements

### Requirement: Conflict merge editor

When the user chooses to merge a Conflict entry, the system SHALL render the source and target definitions as a single editable text document, with fields not present in either definition omitted, the adapter-specific extra field bag excluded, lines identical between source and target merged automatically without markers, and differing lines wrapped in conflict markers labeled with "target" and "source", then open that document in the user's editor for the user to resolve by hand.

#### Scenario: Identical lines merge without markers

- **WHEN** a field of a Conflict entry has the same value in both the source and target definitions
- **THEN** the rendered merge document shows that field once, with no conflict markers around it

#### Scenario: Differing lines are wrapped in conflict markers

- **WHEN** a field of a Conflict entry differs between the source and target definitions
- **THEN** the rendered merge document wraps the target's lines and the source's lines for that field between conflict markers labeled "target" and "source" respectively

#### Scenario: Extra fields are excluded from the merge editor

- **WHEN** a Conflict entry's source or target definition includes adapter-specific extra fields
- **THEN** the rendered merge document omits those extra fields entirely

#### Scenario: Editor selection follows environment, then platform default

- **WHEN** the system opens the merge document for editing
- **THEN** it uses the `$VISUAL` environment variable if set, otherwise `$EDITOR` if set, otherwise a platform default editor

### Requirement: Merge editor validation and recovery

After the user closes the editor, the system SHALL validate the edited document before accepting it as the entry's merged definition, and SHALL let the user choose to fix their existing edits or redo from the original document when validation fails.

#### Scenario: Valid merge document is accepted

- **WHEN** the edited document contains no leftover conflict markers and parses into a valid server entry
- **THEN** the system uses the parsed entry as the merged definition for that server name

#### Scenario: Leftover conflict markers are rejected with a fix-or-redo choice

- **WHEN** the edited document still contains conflict markers after the editor closes
- **THEN** the system reports that unresolved conflict markers remain and lets the user choose to reopen the editor with their edits intact or reopen the editor reset to the original document

#### Scenario: Invalid content is rejected with a fix-or-redo choice

- **WHEN** the edited document has no leftover conflict markers but does not parse into a valid server entry
- **THEN** the system reports the validation error and lets the user choose to reopen the editor with their edits intact or reopen the editor reset to the original document
