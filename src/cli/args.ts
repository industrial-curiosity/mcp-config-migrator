export type CliCommand =
  | { kind: "migrate" }
  | { kind: "restore"; filePath?: string }
  | { kind: "config-backup" }
  | { kind: "help" };

export function parseArgs(argv: string[]): CliCommand {
  const [first, ...rest] = argv;

  if (first === undefined) return { kind: "migrate" };
  if (first === "--help" || first === "-h" || first === "/?") return { kind: "help" };

  if (first === "restore") {
    const flagIndex = rest.findIndex((arg) => arg === "--file" || arg === "-f");
    const filePath = flagIndex >= 0 ? rest[flagIndex + 1] : undefined;
    return { kind: "restore", filePath };
  }

  if (first === "config" && rest[0] === "backup") return { kind: "config-backup" };

  return { kind: "help" };
}
