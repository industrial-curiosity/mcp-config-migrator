# Pre-Summary Edit

## Purpose

Define the interactive server-management step that runs before migration confirmation.

## Requirements

### Requirement: Optional pre-summary edit step

After conflict resolution and before the migration summary, the system SHALL present an optional iterative server-management menu over the current merged configuration. The menu SHALL let the user select one current server to edit, delete a server through the editor's skip behavior, add a server, or finish editing. **Add a server** SHALL appear immediately above **Finish editing**, including when the merged configuration has no current servers. After each edit, deletion, or addition, the menu SHALL present the updated list of servers. Selecting finish without making changes SHALL leave the merged configuration unchanged and proceed directly to the migration summary.

#### Scenario: User finishes without edits

- **WHEN** the user selects finish at the pre-summary server-management menu before editing, deleting, or adding any server
- **THEN** the merged configuration is unchanged and the flow proceeds directly to the migration summary

#### Scenario: User edits a server and returns to the menu

- **WHEN** the user selects a server and saves a valid edited definition
- **THEN** the system replaces that server in the merged configuration and presents the server-management menu again

#### Scenario: User deletes a server and returns to the menu

- **WHEN** the user selects a server and saves an editor skip signal
- **THEN** the system removes that server from the merged configuration and presents the server-management menu again without the removed server

#### Scenario: User adds a server and returns to the menu

- **WHEN** the user chooses **Add a server**, supplies a unique name and transport, and saves a valid template-derived definition
- **THEN** the system adds the server to the merged configuration and presents the server-management menu again with the new server available for selection

### Requirement: Server editing via normalized JSON

For each server selected in the edit prompt, the system SHALL open the user's configured editor (`$VISUAL`, then `$EDITOR`, then a platform default) with a skip instruction header followed by the server's normalized JSON definition. The skip instruction header SHALL appear on a dedicated line before the JSON object and SHALL read exactly: `// To SKIP this server, clear all content and save.` After the editor exits, the system SHALL first check for a skip signal (before any JSON parsing); if no skip signal is detected, the system SHALL validate the result and, if invalid, offer a fix-or-redo loop identical to the one used in conflict merge editing.

The skip signal check SHALL strip the skip instruction header line and then treat the remaining content as a skip if it is: empty, whitespace-only, or an empty JSON object (`{}` with optional internal whitespace). This check occurs before JSON parsing so that `{}` is never presented as a validation error.

#### Scenario: Skip instruction is visible in editor

- **WHEN** the editor opens for a server
- **THEN** the first line of the file is `// To SKIP this server, clear all content and save.` followed by the server's normalized JSON

#### Scenario: User saves a valid edited definition

- **WHEN** the user saves the editor with a valid normalized JSON object
- **THEN** the server's definition in the merged configuration is replaced with the edited definition and the management menu is shown again

#### Scenario: User saves an invalid definition

- **WHEN** the user saves the editor with malformed JSON or an unrecognized field
- **THEN** the system reports the validation error and offers the user a choice to fix (reopen with edits kept) or redo (reopen with the original definition)

#### Scenario: Empty file triggers skip

- **WHEN** the user clears all content in the editor and saves an empty file
- **THEN** the server is removed from the merged configuration and the system logs a confirmation message naming the server that was skipped

#### Scenario: Whitespace-only content triggers skip

- **WHEN** the user saves the editor with content that, after stripping the skip instruction header, consists only of whitespace characters
- **THEN** the server is removed from the merged configuration and the system logs a confirmation message naming the server that was skipped

#### Scenario: Empty braces trigger skip, not a validation error

- **WHEN** the user saves the editor with only `{}` (optionally with internal whitespace) after the skip instruction header
- **THEN** the server is treated as a skip signal — it is removed from the merged configuration and the system logs a confirmation — rather than triggering a validation error for missing `transport`

### Requirement: Server creation via normalized JSON templates

When a user chooses **Add a server**, the system SHALL prompt first for a non-empty server name not already present in the in-memory configuration and then for one of the supported normalized transports: `stdio`, `http`, or `sse`. It SHALL open the configured editor with a normalized-JSON template that contains the selected transport and its primary field (`command` for `stdio`, `url` for `http` and `sse`). The editor SHALL use the existing normalized JSON validation and fix-or-redo behavior, but SHALL not require a non-empty command or URL before adding the definition.

#### Scenario: User creates a server with an empty primary field

- **WHEN** the user chooses a transport and saves an otherwise valid template-derived definition with an empty command or URL
- **THEN** the system adds the server to the in-memory merged configuration

#### Scenario: Creation name duplicates a current server

- **WHEN** the user enters a name that is already present in the current merged configuration
- **THEN** the system reports that the name is unavailable and prompts for another name before requesting a transport

### Requirement: Pre-summary edit summary accounting

The migration summary SHALL reflect the outcome of any manual edits applied in the pre-summary edit step. The reclassification rules are:

- A server from a source "add" entry that was skipped SHALL appear under **Skipped**, not **Added**.
- A server from a source "unchanged" entry that was manually edited SHALL appear under **Conflicts resolved → merged**, not **Unchanged**.
- A server from a source "unchanged" entry that was skipped SHALL appear under **Skipped**, not **Unchanged**.
- A server from a source "conflict" entry (any resolution) that was skipped SHALL appear under **Skipped**.
- A server from a source "conflict" entry resolved as "accept-target" or "accept-source" that was then manually edited SHALL appear under **Conflicts resolved → merged**.
- A server from a source "add" entry that was manually edited SHALL remain under **Added** (it is still new to the target).
- A server created during the pre-summary edit step SHALL appear under **Added**.
- A server created and then deleted during the same pre-summary edit step SHALL not appear in any migration-summary category.

#### Scenario: Skipped server appears in summary

- **WHEN** the user skips one or more servers in the edit step
- **THEN** the migration summary shows a **Skipped (N)** line listing the skipped server names

#### Scenario: Manually edited unchanged server reclassified

- **WHEN** the user manually edits a server that was classified as "unchanged" (identical in both source and target)
- **THEN** the migration summary shows that server under **Conflicts resolved → merged**, not **Unchanged**

#### Scenario: Edited add entry remains under Added

- **WHEN** the user manually edits a server that was classified as "add" (not present in the target)
- **THEN** the migration summary shows that server under **Added**

#### Scenario: Created server appears under Added

- **WHEN** the user creates a server in the pre-summary edit step and finishes editing
- **THEN** the migration summary shows that server under **Added**

#### Scenario: Deleted created server has no summary entry

- **WHEN** the user creates a server and then deletes it before finishing the pre-summary edit step
- **THEN** the migration summary does not list that server under **Added**, **Skipped**, **Unchanged**, or **Conflicts resolved**

### Requirement: ManualEdits data type

The system SHALL use an explicit `ManualEdits` data type — containing the sets of server names that were created, edited, and skipped — as the interface between the edit step and the summary function. The `summarize()` function SHALL accept this as an optional third parameter, defaulting to no edits when absent, so existing callers are unaffected.

#### Scenario: No ManualEdits passed to summarize

- **WHEN** `summarize()` is called without a `ManualEdits` argument
- **THEN** the output is identical to the current behavior with no created, skipped, or reclassified entries

#### Scenario: ManualEdits passed with created, edited, and skipped entries

- **WHEN** `summarize()` is called with a `ManualEdits` argument naming created, edited, and skipped servers
- **THEN** the output applies the reclassification rules, includes created servers under **Added**, and includes the skipped category
