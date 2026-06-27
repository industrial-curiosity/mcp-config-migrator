## Context

The mcp-config-migrator exposes IDE adapters that each implement a single `IdeAdapter` interface (`src/adapters/types.ts`). Adding a new IDE means writing one new adapter file, registering it, and updating the spec. The existing adapters (Cursor, Claude Code) share the same `mcpServers` JSON shape that Pi also uses via `pi-mcp-adapter`, so the implementation is largely a copy-adapt of the Cursor adapter with Pi-specific paths and one UX addition: a prerequisite notice.

## Goals / Non-Goals

**Goals:**
- Ship a `piAdapter` that allows Pi to be selected as source or target in every CLI flow (migrate, backup, restore).
- Default path resolves to `~/.pi/agent/mcp.json` (global) or `.pi/mcp.json` (project-local).
- When Pi is selected as a **target**, print a one-time warning that `pi-mcp-adapter` must be installed.

**Non-Goals:**
- Supporting Pi's project-override path (`.pi/mcp.json`) as anything other than a user-selectable scope option — we do not auto-detect it.
- Handling Pi's `directTools` extension field as a first-class field; it will be preserved via the existing extra-fields passthrough.
- Installing or verifying `pi-mcp-adapter` automatically.

## Decisions

### 1. Reuse `mcpServers` parsing without changes

Pi's config format (documented in `docs/pi-mcp-config.md`) uses the same `{ "mcpServers": { ... } }` shape as Cursor and Claude Code. The existing `entryToNormalized` / `normalizedToEntry` helpers in `entryFields.ts` handle this without modification.

**Alternative considered**: write a custom parser for Pi's additional fields (`directTools`). Rejected — `directTools` is already handled by the existing extra-fields passthrough, and a custom parser adds complexity with no UX payoff.

### 2. Prerequisite notice at the CLI layer, not the adapter layer

The `IdeAdapter` interface has no mechanism for emitting warnings during save. Rather than extend the interface, the notice is emitted by the CLI flow (`mergeFlow.ts`, `restoreFlow.ts`) when the selected target adapter id is `"pi"`. This is the same pattern used for other target-specific messages and keeps the adapter pure.

**Alternative considered**: add a `postSaveNotice?: string` field to `IdeAdapter`. Rejected — over-engineering for a single adapter edge case; a simple `if (targetAdapter.id === 'pi')` in the flow is cleaner.

### 3. Default path is `~/.pi/agent/mcp.json` for global scope

The user specified `~/.pi` as the Pi config root. The actual MCP config file within that root is `~/.pi/agent/mcp.json` (per the docs). Exposing the full path as the default is consistent with how other adapters name their default path candidates.

## Risks / Trade-offs

- **Pi config format stability** → Pi is an early-stage tool; the `mcpServers` format could change. Mitigation: the adapter is thin and easily updated; the notice instructs users to check Pi docs.
- **`pi-mcp-adapter` not installed** → The migrator will write the config correctly but MCP tools will silently not work in Pi. Mitigation: the prerequisite notice at target-selection time.

## Migration Plan

No data migration needed. The change adds a new adapter; existing configs are unaffected. The Pi adapter is available immediately after the release that includes it.
