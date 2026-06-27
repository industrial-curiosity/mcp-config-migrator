## 1. Pi Adapter

- [x] 1.1 Update `src/adapters/pi.ts` `resolveDefaultPaths` to return all four scope candidates — global-shared (`~/.config/mcp/mcp.json`), global (`~/.pi/agent/mcp.json`), project-shared (`.mcp.json`), project (`.pi/mcp.json`) — each with a `hint` describing its precedence and sharing behavior
- [x] 1.2 Update `src/adapters/pi.test.ts` path resolution tests to cover all four scopes (macOS/Linux and Windows), and add a test that the `hint` field is set on each candidate

## 2. Adapter Registration

- [x] 2.1 Import `piAdapter` in `src/adapters/registry.ts` and add it to the `adapters` array

## 3. Prerequisite Notice

- [x] 3.1 In `src/cli/flow.ts` (the main migration flow, not mergeFlow.ts which is the conflict editor helper), after the user confirms Pi as the target IDE, print a notice: `"Note: Pi requires pi-mcp-adapter to use MCP servers. Install it with: pi install npm:pi-mcp-adapter"` before writing the config
- [x] 3.2 Apply the same notice in `src/cli/restoreFlow.ts` when the restore target adapter is `"pi"`

## 4. Scope Hint Support

- [x] 4.1 Add optional `hint?: string` field to `DefaultPathCandidate` in `src/adapters/types.ts`
- [x] 4.2 Update `selectScopeAndPath` in `src/cli/flow.ts` to use `c.hint ? \`${c.path} · ${c.hint}\` : c.path` as the clack option hint

## 5. Documentation

- [x] 5.1 Update `README.md` scope table to show all four Pi scopes and mention the hint behavior
