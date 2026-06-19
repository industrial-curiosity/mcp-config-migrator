#!/usr/bin/env node
import { parseArgs } from "./args.js";
import { runConfigBackup } from "./configBackupFlow.js";
import { runCli } from "./flow.js";
import { runRestore } from "./restoreFlow.js";

function printHelp(): void {
  console.log(
    [
      "mcp-config-migrator",
      "",
      "Usage:",
      "  mcp-config-migrator                       Interactively migrate MCP servers between IDEs",
      "  mcp-config-migrator restore [--file|-f <path>]",
      "                                             Restore a previously backed-up version",
      "  mcp-config-migrator config backup          View or change the backup preference and storage location",
      "  mcp-config-migrator --help, -h, /?         Show this help",
    ].join("\n"),
  );
}

try {
  const command = parseArgs(process.argv.slice(2));
  switch (command.kind) {
    case "migrate":
      await runCli();
      break;
    case "restore":
      await runRestore({ filePath: command.filePath });
      break;
    case "config-backup":
      await runConfigBackup();
      break;
    case "help":
      printHelp();
      break;
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
