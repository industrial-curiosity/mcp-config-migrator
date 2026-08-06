# MCP Server Creation Design

## Context

`editMergedServers` is the shared server-management interaction for direct editing and the pre-summary migration step. It currently builds a menu only from existing server names and exits without a prompt for an empty configuration. It can edit existing entries and delete them through the editor skip signal, but it cannot create a normalized server.

## Goals / Non-Goals

**Goals:**

- Let users add servers from either flow before the existing confirmation-gated write.
- Keep creation in the shared manager so direct edit and migration have identical behavior.
- Give users a name and transport-specific editor template without validating command or URL completeness at creation time.
- Reflect user-created servers accurately in both summaries.

**Non-Goals:**

- Add non-interactive server creation, command-line flags, or adapter-format changes.
- Change the clear-editor deletion behavior for existing servers.
- Add validation that `command` or `url` is non-empty.

## Decisions

### Add action is a permanent menu item

The manager will render current server entries followed by **Add a server** and then **Finish editing**. This makes the action available for empty configurations and preserves the requested placement directly above the finish action. Action values will be distinct from server-name values so a server name cannot collide with a menu command.

### Creation collects identity before editing a template

Choosing **Add a server** will first prompt for a non-empty name that is not currently present in the in-memory configuration, then prompt for `stdio`, `http`, or `sse`. The selected transport determines the editable normalized-JSON template. The name is passed separately to the existing parser, rather than becoming another user-editable JSON field.

The `stdio` template includes `transport` and `command`; the remote templates include `transport` and `url`. Empty command and URL values remain acceptable at this stage. The user can edit the template in the same fix-or-redo loop used for existing server definitions. A successful result is added to the in-memory server map and appears on the next menu render.

This separates the stable server identifier from the transport definition and reuses the current editor and parser rather than introducing a second creation form. A single JSON document containing the name was considered, but it would require duplicate identity validation inside the editor and diverge from the existing normalized editor shape.

### Manual edits record created names

`ManualEdits` will gain a set of created names. Direct edit will render created, edited, and deleted categories. Migration summary accounting will add a created entry to **Added** even though it has no source classification. If a server created during the manager session is then deleted before confirmation, it is removed from the created set and does not appear in the summary.

## Risks / Trade-offs

- [An empty command or URL can produce an unusable server definition] → This is intentional: creation retains the existing normalized-shape validation only.
- [A user can add an SSE server while targeting Codex] → Existing adapter save behavior reports and drops unsupported SSE definitions; this change does not alter adapter compatibility rules.
- [The iterative flow takes multiple prompts per new server] → It keeps creation consistent with the existing editor-based editing experience and prevents duplicate names before opening the editor.

## Migration Plan

This is an additive CLI interaction change with no on-disk data migration. Existing configurations and commands continue to work. Rollback consists of removing the menu action and its summary accounting; no saved data requires conversion.

## Open Questions

None.
