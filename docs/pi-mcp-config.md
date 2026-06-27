# Pi Agent - MCP & External Tool Integration

## Important: Pi Has No Built-in MCP

Pi intentionally does **not** support the Model Context Protocol (MCP).
It uses its own **extension system** instead of MCP servers.

> "It intentionally does not include built-in MCP, sub-agents, permission popups, plan mode,
> to-dos, or background bash. You can build or install those workflows as extensions or packages."
> - Pi docs

---

## MCP Support via `pi-mcp-adapter`

Pi does not have built-in MCP support, but the `pi-mcp-adapter` package bridges the gap.
It exposes a single lightweight `mcp` proxy tool (~200 tokens) instead of loading every MCP
server's full tool list into context. Servers start lazily on first use and disconnect when idle.

### Install

```bash
pi install npm:pi-mcp-adapter
```

Restart Pi after installation.

### Configure MCP servers

Add your servers to any of these files (later entries in the list override earlier ones):

| File | Scope |
|---|---|
| `~/.config/mcp/mcp.json` | User-global shared (works across all tools) |
| `~/.pi/agent/mcp.json` | Pi global override |
| `.mcp.json` | Project-local shared |
| `.pi/mcp.json` | Pi project override |

**Stdio server (e.g. Atlassian/Jira):**
```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["@timbreeding/jira-mcp-server@latest", "--jira-base-url=https://yourorg.atlassian.net"]
    }
  }
}
```

**Remote HTTP server (e.g. Coralogix):**
```json
{
  "mcpServers": {
    "coralogix": {
      "url": "https://api.coralogix.us/mgmt/api/v1/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

### Use MCP tools in Pi

```
mcp({ })                                    # show status of all servers
mcp({ server: "atlassian" })                # list tools for a server
mcp({ search: "jira issue" })               # search across all tools
mcp({ tool: "get_issue", args: '{"id":"PROJ-123"}' })   # call a tool
mcp({ connect: "coralogix" })              # manually connect a server
```

### Commands

| Command | What it does |
|---|---|
| `/mcp` | Interactive panel with server status and tool toggles |
| `/mcp setup` | Guided first-run setup and config import from other tools |
| `/mcp tools` | List all available tools |
| `/mcp reconnect <server>` | Connect or reconnect a server |

### Optional: promote tools to direct tools

By default all MCP tools go through the proxy. To make specific tools first-class
(visible directly alongside `read`, `bash`, etc.):

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "some-mcp-server"],
      "directTools": ["tool_a", "tool_b"]
    }
  }
}
```

Use `"directTools": true` to promote all tools (best for small servers with <20 tools).

### Import existing configs from other tools

If you already have MCP servers configured in Cursor, Claude Code, etc.:

```bash
pi-mcp-adapter init
```

Or in Pi:
```
/mcp setup
```

---

## How to Add Tools to Pi

### Option 1: Install a Pi Package (recommended)

Pi packages bundle extensions, skills, and prompt templates published to npm or git.

```bash
# Install from npm
pi install npm:@scope/package-name

# Install from git
pi install git:github.com/user/repo

# Try without installing (temporary)
pi -e npm:@scope/package-name

# List installed packages
pi list

# Remove a package
pi remove npm:@scope/package-name
```

Installed packages are saved to `~/.pi/agent/settings.json` globally,
or `.pi/settings.json` for project scope (shareable with your team).

---

### Option 2: Load a Local Extension File

Write a `.ts` or `.js` extension and load it at runtime:

```bash
# Load for one session
pi --extension ./my-extension.ts

# Or use the short flag
pi -e ./my-extension.ts
```

To auto-load on every session, place the file in:

```
~/.pi/agent/           # global
.pi/extensions/        # project-local (requires project trust)
```

Or register it in `settings.json`:

```json
{
  "extensions": ["./path/to/my-extension.ts"]
}
```

---

### Option 3: Wrap an MCP Server as a Pi Extension

If you have an MCP server (e.g. Atlassian, Coralogix) you can wrap it
by calling its HTTP/stdio interface from a custom Pi extension tool.

Minimal pattern - call an external HTTP endpoint as a Pi tool:

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "my_mcp_tool",
    description: "Calls an external service",
    parameters: Type.Object({
      query: Type.String(),
    }),
    async execute(_id, params, signal) {
      const res = await fetch("https://your-mcp-server/endpoint", {
        method: "POST",
        headers: { Authorization: "Bearer YOUR_TOKEN" },
        body: JSON.stringify({ query: params.query }),
        signal,
      });
      const data = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        details: {},
      };
    },
  });
}
```

---

## Extension Auto-discovery

Pi automatically loads extensions from these directories (no config needed):

| Path | Scope |
|---|---|
| `~/.pi/agent/extensions/` | Global |
| `.pi/extensions/` | Project (requires trust) |
| `.pi/` top-level `.ts`/`.js` files | Project (requires trust) |

Files listed in `settings.json` under `extensions` are also loaded.

---

## Skills (Prompt Injection)

Pi skills are markdown files that inject context into the system prompt.
They are the closest equivalent to MCP "resource" prompts.

Place a skill file at:

```
~/.pi/agent/skills/my-skill.md       # global
.pi/skills/my-skill.md               # project-local
```

Or register in `settings.json`:

```json
{
  "skills": ["./path/to/skills/"]
}
```

---

## Comparison: MCP vs Pi Extension System

| MCP Concept | Pi Equivalent |
|---|---|
| MCP Server | Pi Extension (`.ts` file) |
| MCP Tool | `pi.registerTool(...)` |
| MCP Resource / Prompt | Pi Skill (`.md` file) |
| `mcp` block in config | `extensions` / `packages` in `settings.json` |
| `npx @some/mcp-server` | `pi install npm:@some/pi-package` |

---

## Summary

Pi does **not** have an `mcp` config block. To connect external services:

1. Look for a published Pi package: `pi install npm:package-name`
2. Write a local extension that calls the service directly
3. Use Pi skills for prompt-level context injection
