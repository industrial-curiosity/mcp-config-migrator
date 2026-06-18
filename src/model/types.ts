export type Transport = "stdio" | "http" | "sse";

/**
 * Fields outside the common shape, tagged with the IDE that produced them.
 * Only re-emitted when serializing back through the same IDE's adapter;
 * dropped (with a warning) when migrating cross-IDE.
 */
export interface ExtraFields {
  sourceIdeId: string;
  fields: Record<string, unknown>;
}

export interface NormalizedMcpServer {
  name: string;
  transport: Transport;
  // stdio
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  // remote (http/sse)
  url?: string;
  headers?: Record<string, string>;
  extra?: ExtraFields;
}

export interface NormalizedConfig {
  servers: NormalizedMcpServer[];
}
