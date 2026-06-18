# Tasks: Add mcp-config-migrator

## 1. Project setup

- [x] 1.1 Initialize `package.json` (name `mcp-config-migrator`, `type: module`, `bin: { "mcp-config-migrator": "dist/cli.js" }`, Node engine `>=18`)
- [x] 1.2 Add TypeScript config (`tsconfig.json`) and build tooling (`tsup` or `tsc`) producing ESM output to `dist/`
- [x] 1.3 Add ESLint + `typescript-eslint` config
- [x] 1.4 Add Vitest config and `test` script
- [x] 1.5 Add dependencies: `@clack/prompts`, `diff`, `jsonc-parser`; add dev dependencies: `typescript`, `tsup`, `vitest`, `eslint`, `typescript-eslint`
- [x] 1.6 Create source directory structure: `src/model/`, `src/adapters/`, `src/engine/`, `src/cli/`

## 2. Normalized model

- [x] 2.1 Define `NormalizedMcpServer` and `NormalizedConfig` types in `src/model/types.ts` (name, transport `stdio|http|sse`, command/args/cwd/env for stdio, url/headers for remote, `extra` bag for adapter-specific fields)
- [x] 2.2 Implement a deep-equality comparator for two `NormalizedMcpServer` entries (used for Unchanged vs Conflict classification)
- [x] 2.3 Implement a backup utility that writes a timestamped copy of an existing file before it is overwritten

## 3. IDE adapters

- [x] 3.1 Define the `IdeAdapter` interface (`id`, `label`, `resolveDefaultPaths(env, platform)`, `load(path)`, `save(path, normalized)`) in `src/adapters/types.ts`
- [x] 3.2 Implement the VS Code adapter: parse/serialize the `servers` key with mandatory `type`, using `jsonc-parser` to preserve comments; compute default paths for macOS/Linux/Windows (workspace `.vscode/mcp.json` and user profile path, respecting `XDG_CONFIG_HOME` on Linux)
- [x] 3.3 Implement the Cursor adapter: parse/serialize the `mcpServers` key (optional `type` for stdio); compute default paths for global (`~/.cursor/mcp.json` / `%USERPROFILE%\.cursor\mcp.json`) and project (`<cwd>/.cursor/mcp.json`) scopes
- [x] 3.4 Implement the Claude Code adapter: parse/serialize the `mcpServers` key within `~/.claude.json` (surgical replace, preserving all other top-level keys) and `.mcp.json` for project scope; compute the user-scope default path honoring `CLAUDE_CONFIG_DIR` when set, falling back to `~/.claude.json`
- [x] 3.5 Implement missing-file handling shared by all adapters: a non-existent path loads as an empty `NormalizedConfig`
- [x] 3.6 Implement an adapter registry mapping IDE id to its adapter instance

## 4. Migration engine

- [x] 4.1 Implement entry classification (`add` / `unchanged` / `conflict`) comparing source and target `NormalizedConfig`s by server name
- [x] 4.2 Implement conflict diff rendering using the `diff` package over pretty-printed JSON of each conflicting entry's source vs target definition
- [x] 4.3 Implement merge application: given classifications and a resolution choice per conflict (`accept-target` / `accept-source`), produce the merged `NormalizedConfig`
- [x] 4.4 Implement the migration summary (counts and server names of added, conflicts by resolution choice, unchanged)
- [x] 4.5 Wire the backup utility into the write path so a backup is created whenever an existing target file is about to be overwritten

## 5. CLI workflow

- [x] 5.1 Create the CLI entry point (`src/cli/index.ts`, compiled to `dist/cli.js` with a `#!/usr/bin/env node` shebang)
- [x] 5.2 Implement source IDE selection, then source scope/path prompt (pre-filled with the adapter's computed default, editable)
- [x] 5.3 Implement target IDE selection, then target scope/path prompt (same pattern)
- [x] 5.4 Load both configs via their adapters and run classification; if there are no additions and no conflicts, report "nothing to migrate" and exit without writing or backing up
- [x] 5.5 For each conflict, show the diff and prompt the user for accept-target/accept-source
- [x] 5.6 Show the migration summary, including the server names in each category, and require explicit confirmation before writing
- [x] 5.7 On confirmation, back up the existing target file (if present) and write the merged config via the target adapter
- [x] 5.7a If the target is Claude Code project scope (`.mcp.json`) and the write adds or changes any server entries, show a notice listing those server names and the `claude mcp reset-project-choices` command before/with the success message
- [x] 5.8 On decline, exit without modifying any file
- [x] 5.9 Handle cancellation (Ctrl+C / clack cancel) at any prompt by exiting immediately without writing or backing up
- [x] 5.10 After a successful write, run the post-migration cleanup step: multi-select prompt listing all server names now in the target config, remove selected entries, and re-save only if any were removed

## 6. Testing

- [x] 6.1 Unit tests per adapter: parse/serialize round-trip for stdio and remote entries, default path computation per OS (mock `process.platform`/`process.env`), missing-file-as-empty behavior
- [x] 6.2 Unit test: Claude Code adapter preserves unrelated top-level keys in `~/.claude.json` when writing
- [x] 6.3 Unit tests for the migration engine: classification (add/unchanged/conflict), merge application for each resolution choice, summary counts and server names per category
- [x] 6.4 CLI workflow tests covering: happy path with additions only, a run with conflicts resolved each of the two ways, cancellation mid-flow, no-op detection, and post-migration cleanup (with and without removals)
- [x] 6.5 CLI workflow test: writing added/changed entries to a Claude Code project-scope target shows the re-approval notice naming the affected servers; no notice appears for other targets or no-op writes

## 7. Packaging and docs

- [x] 7.1 Finalize `package.json` `files`/`exports`/`bin` fields and run `npm pack --dry-run` to verify the published contents
- [x] 7.2 Write `README.md` covering installation/usage (`npx mcp-config-migrator`), the supported IDEs and their config scopes/default paths, and an example run
- [x] 7.3 Update README.md and docs/spec.md to reflect any user-facing or architectural changes introduced by this change
