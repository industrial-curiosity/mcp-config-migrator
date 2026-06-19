import type { NormalizedMcpServer, Transport } from "../model/types.js";

const TRANSPORTS: readonly Transport[] = ["stdio", "http", "sse"];
const STDIO_KEYS = ["transport", "command", "args", "cwd", "env"];
const REMOTE_KEYS = ["transport", "url", "headers"];
const MARKER_PATTERN = /^(<{7}|={7}|>{7})/m;

export class MergeValidationError extends Error {}

export function hasUnresolvedMarkers(text: string): boolean {
  return MARKER_PATTERN.test(text);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === "string")
  );
}

/**
 * Parses and validates the text edited in the merge editor into a server
 * entry. The editor only ever shows the common normalized shape (no `name`,
 * no `extra`), so this rejects anything outside that shape rather than
 * silently stashing unrecognized fields.
 */
export function parseMergedServer(name: string, text: string): NormalizedMcpServer {
  if (hasUnresolvedMarkers(text)) {
    throw new MergeValidationError(
      "Unresolved conflict markers remain. Remove every <<<<<<<, =======, and >>>>>>> line before saving.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new MergeValidationError(`Invalid JSON: ${(err as Error).message}`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new MergeValidationError("The merged entry must be a JSON object.");
  }
  const raw = parsed as Record<string, unknown>;

  if (!TRANSPORTS.includes(raw.transport as Transport)) {
    throw new MergeValidationError(`"transport" must be one of: ${TRANSPORTS.join(", ")}`);
  }
  const transport = raw.transport as Transport;

  const allowedKeys = transport === "stdio" ? STDIO_KEYS : REMOTE_KEYS;
  const unknownKeys = Object.keys(raw).filter((key) => !allowedKeys.includes(key));
  if (unknownKeys.length > 0) {
    throw new MergeValidationError(`Unrecognized field(s): ${unknownKeys.join(", ")}`);
  }

  const server: NormalizedMcpServer = { name, transport };
  if (transport === "stdio") {
    if (raw.command !== undefined) {
      if (typeof raw.command !== "string") throw new MergeValidationError(`"command" must be a string`);
      server.command = raw.command;
    }
    if (raw.args !== undefined) {
      if (!Array.isArray(raw.args) || !raw.args.every((a) => typeof a === "string")) {
        throw new MergeValidationError(`"args" must be an array of strings`);
      }
      server.args = raw.args;
    }
    if (raw.cwd !== undefined) {
      if (typeof raw.cwd !== "string") throw new MergeValidationError(`"cwd" must be a string`);
      server.cwd = raw.cwd;
    }
    if (raw.env !== undefined) {
      if (!isStringRecord(raw.env)) throw new MergeValidationError(`"env" must be an object of string values`);
      server.env = raw.env;
    }
  } else {
    if (raw.url !== undefined) {
      if (typeof raw.url !== "string") throw new MergeValidationError(`"url" must be a string`);
      server.url = raw.url;
    }
    if (raw.headers !== undefined) {
      if (!isStringRecord(raw.headers)) {
        throw new MergeValidationError(`"headers" must be an object of string values`);
      }
      server.headers = raw.headers;
    }
  }
  return server;
}
