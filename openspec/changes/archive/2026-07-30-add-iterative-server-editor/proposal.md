# Add Iterative Server Editor

## Why

The CLI currently requires a source configuration to make an edit, and its pre-write edit step requires users to select every server they intend to manage before editing begins. Users need a direct way to edit one MCP configuration and an iterative workflow that keeps the current server list visible after each edit or deletion.

## What Changes

- Add an `edit` command that selects one IDE configuration, lets the user manage its MCP servers, and writes only after explicit confirmation.
- Replace migration's pre-summary batch multiselect with a shared one-at-a-time server-management menu.
- Let the shared menu edit a selected server in the existing normalized JSON editor, delete it using the existing clear-content behavior, and return to an updated list until the user finishes.
- Apply the existing backup preference and surgical adapter save behavior to confirmed direct-edit writes.

## Capabilities

### New Capabilities

- `direct-config-editing`: Select and directly manage the MCP servers in one IDE configuration.

### Modified Capabilities

- `cli-workflow`: Add the `edit` command and change migration's pre-write editing interaction to an iterative menu.
- `pre-summary-edit`: Replace preselected batch editing with iterative, repeatable server editing and deletion.

## Impact

This affects CLI argument parsing and dispatch, the interactive flow and edit-step APIs, backup integration, tests for argument parsing and interactive workflows, and the README and architecture documentation. No new runtime dependency or adapter format is required.
