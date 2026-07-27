# IDE Config Adapters Delta

## MODIFIED Requirements

### Requirement: Supported IDE list

The system SHALL support exactly Claude Code, Codex, Cursor, Pi, and VS Code as selectable source and target IDEs.

#### Scenario: Selecting source and target

- **WHEN** the user is prompted to choose a source IDE and, separately, a target IDE
- **THEN** the only options offered are Claude Code, Codex, Cursor, Pi, and VS Code

### Requirement: Config scope selection

For IDEs that support more than one MCP config scope (VS Code: workspace or user; Cursor: global or project; Claude Code: user or project; Codex: user or project), the system SHALL ask the user which scope to use before suggesting a path.

#### Scenario: Claude Code scope choice

- **WHEN** the user selects Claude Code as the source or target IDE
- **THEN** the system asks whether to use the user-scope config (`~/.claude.json`) or the project-scope config (`.mcp.json`)

#### Scenario: Codex scope choice

- **WHEN** the user selects Codex as the source or target IDE
- **THEN** the system asks whether to use the user-scope config (`~/.codex/config.toml`) or the project-scope config (`.codex/config.toml`)
