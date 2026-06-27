## MODIFIED Requirements

### Requirement: Interactive entry point

Running `npx mcp-config-migrator` SHALL start an interactive CLI session that guides the user through source IDE selection, target IDE selection, config path confirmation for each, conflict resolution, an optional pre-summary edit step, write confirmation, and optional cleanup, in that order.

#### Scenario: Standard run order

- **WHEN** the user runs `npx mcp-config-migrator`
- **THEN** the CLI prompts, in order: source IDE, source scope/path, target IDE, target scope/path, conflict resolution (if any conflicts exist), then the optional pre-summary edit step, then the migration summary and write confirmation before any file is written
