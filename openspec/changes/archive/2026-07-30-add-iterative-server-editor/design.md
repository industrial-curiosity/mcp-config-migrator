# Iterative Server Editor Design

## Context

Migration already produces a normalized target configuration and invokes `editMergedServers` before its summary. That function uses a multiselect to choose every server up front, while deletion is only available by clearing a server in the editor or through a separate post-write cleanup multiselect. There is no flow for loading and managing a single selected configuration without a migration source.

## Goals / Non-Goals

**Goals:**

- Provide `mcp-config-migrator edit` for managing one existing IDE configuration.
- Use one iterative server-management interaction in both direct editing and migration.
- Keep all edits in memory until one explicit write confirmation.
- Preserve adapter-specific fields and unrelated file content through existing adapter load/save operations.
- Retain existing editor validation and clear-content deletion behavior.

**Non-Goals:**

- Creating servers, changing IDE scopes after selection, or editing non-MCP configuration.
- Non-interactive editing, batch file arguments, or changes to adapter formats.
- Writing a config while the user is still navigating the management menu.

## Decisions

### Shared manager returns a changed normalized configuration

Replace the migration-specific batch-selection API with a shared manager that accepts a `NormalizedConfig`, presents a single-select menu of its current server names plus a finish action, and returns the updated config together with the names edited and deleted. After each editor exit, the manager updates its in-memory map and redraws the menu; a deleted server is absent from later selections.

This reuses the established JSON editor, validation loop, and deletion signal instead of building a second editor. A one-at-a-time menu was chosen over a multiselect because the user can inspect the new state after every action and need not predict every server they will manage.

### Direct editing is a dedicated command with one configuration selection

Extend parsed commands and CLI dispatch with `edit`. Its flow reuses the existing IDE, scope, and editable path prompts, loads that adapter's config, and passes it to the shared manager. It then shows a concise edit/delete summary and asks for write confirmation. A no-argument default remains migration, preserving current invocation behavior.

Use a subcommand rather than an `--edit` flag because the parser already models `restore` and `config backup` as commands and the new mode has a separate flow.

### All writes remain confirmation-gated and backed up consistently

Migration and direct edit both call the existing backup flow only after confirmation and immediately before their adapter save. The selected adapter saves the final normalized config surgically. Direct edit determines changed names from the manager result so target-specific notices can remain applicable where relevant.

The current post-migration cleanup multiselect is removed: deletion happens in the shared pre-write manager, eliminating an extra write and making all migration edits visible in the summary before confirmation.

## Risks / Trade-offs

- [An iterative menu takes more keystrokes for many edits] → It avoids stale batch selections and reflects every completed deletion immediately.
- [Removing post-write cleanup changes an established prompt] → The shared pre-write manager has equivalent deletion capability and prevents an additional unreviewed write.
- [Direct edit can overwrite a concurrently changed file] → This retains the existing one-shot CLI read-modify-write behavior; no new locking or conflict detection is introduced.
- [Adapter-specific fields are not editable in normalized JSON] → Existing adapter round trips retain same-adapter `extra` fields unless a server is manually edited, matching current behavior.

## Migration Plan

Release this as an additive `edit` command and a migration-flow UX change. Existing invocations without arguments continue to migrate. Rollback consists of restoring the prior CLI flow and omitting the new command; no on-disk data migration occurs.

## Open Questions

None.
