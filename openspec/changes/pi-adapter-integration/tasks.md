## 1. Pi Adapter

- [ ] 1.1 Create `src/adapters/pi.ts` implementing `IdeAdapter` with id `"pi"`, label `"Pi"`, `resolveDefaultPaths` returning global (`~/.pi/agent/mcp.json`) and project-local (`.pi/mcp.json`) candidates, and `load`/`save` using the `mcpServers` key (same pattern as `cursor.ts`)
- [ ] 1.2 Create `src/adapters/pi.test.ts` with unit tests covering: global default path resolution, project-local default path resolution, loading a stdio entry, loading a remote entry, preserving a `directTools` field through a round-trip save

## 2. Adapter Registration

- [ ] 2.1 Import `piAdapter` in `src/adapters/registry.ts` and add it to the `adapters` array

## 3. Prerequisite Notice

- [ ] 3.1 In `src/cli/mergeFlow.ts`, after the user confirms Pi as the target IDE, print a notice: `"Note: Pi requires pi-mcp-adapter to use MCP servers. Install it with: pi install npm:pi-mcp-adapter"` before writing the config
- [ ] 3.2 Apply the same notice in `src/cli/restoreFlow.ts` when the restore target adapter is `"pi"`

## 4. Documentation

- [ ] 4.1 Update `README.md` and any docs that list supported IDEs to include Pi, with a note that `pi-mcp-adapter` must be installed
