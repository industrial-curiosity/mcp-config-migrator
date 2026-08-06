# Add MCP Server Creation

## Why

The server-management menu can edit or delete entries that already exist, but cannot create a server. Users need to add MCP servers directly when editing a configuration and while preparing a migration.

## What Changes

- Add an **Add a server** action to the shared server-management menu in direct edit and migration flows. It appears immediately above **Finish editing**, including when the configuration is empty.
- Create servers through a server-name prompt, a transport prompt, and a transport-specific normalized-JSON editor template.
- Require server names to be non-empty and unique in the in-memory configuration; do not impose command or URL completeness validation during creation beyond the existing normalized JSON validation.
- Include created servers in direct-edit and migration summaries. A newly created server that is deleted before confirmation produces no net summary change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `direct-config-editing`: Direct editing can create MCP servers before the confirmation-gated write.
- `pre-summary-edit`: The shared pre-summary manager can create servers and accounts for manually created entries in the migration summary.

## Impact

This affects the shared edit-step interaction and its tests, direct-edit summary rendering and tests, migration summary accounting and tests, and the README. No adapter formats, dependencies, or command-line arguments change.
