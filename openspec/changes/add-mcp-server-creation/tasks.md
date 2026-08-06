# Add MCP Server Creation Tasks

## 1. Creation State and Summary Accounting

- [ ] 1.1 Extend `ManualEdits` to record created server names and preserve accurate state when a newly created server is deleted before confirmation.
- [ ] 1.2 Update migration summary accounting so created servers appear under **Added** without altering existing classification behavior.
- [ ] 1.3 Update the direct-edit summary to render added, edited, and deleted server categories.

## 2. Shared Server-Management Interaction

- [ ] 2.1 Add a distinct **Add a server** menu action immediately before **Finish editing**, keeping it available for empty configurations and collision-free with server names.
- [ ] 2.2 Implement the creation flow: validate a non-empty, unique server name; prompt for `stdio`, `http`, or `sse`; and open a transport-specific normalized-JSON template.
- [ ] 2.3 Reuse the existing editor parsing and fix-or-redo behavior for creation without adding command or URL completeness validation.
- [ ] 2.4 Add successful creations to the in-memory configuration and return to the refreshed shared menu for both direct edit and migration flows.

## 3. Automated Tests

- [ ] 3.1 Extend edit-step tests for empty configurations, menu ordering, unique-name rejection, each transport template, creation return-to-menu behavior, and create-then-delete accounting.
- [ ] 3.2 Extend summary tests for created migration entries and the no-net-change create-then-delete case.
- [ ] 3.3 Extend direct-edit and migration-flow tests to verify created servers are written only after confirmation and are displayed in the appropriate summaries.

## 4. Documentation and Validation

- [ ] 4.1 Run the project test, lint, and type-check commands and resolve any regressions from the new creation flow.
- [ ] 4.2 Update README.md and docs/spec.md to reflect any user-facing or architectural changes introduced by this change.
