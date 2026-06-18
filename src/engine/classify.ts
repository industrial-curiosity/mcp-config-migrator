import type { NormalizedConfig, NormalizedMcpServer } from "../model/types.js";
import { areServersEqual } from "../model/equality.js";

export type ClassificationKind = "add" | "unchanged" | "conflict";

export interface ClassifiedEntry {
  name: string;
  kind: ClassificationKind;
  source: NormalizedMcpServer;
  target?: NormalizedMcpServer;
}

/** Classifies each source entry relative to the target, by server name. */
export function classify(source: NormalizedConfig, target: NormalizedConfig): ClassifiedEntry[] {
  const targetByName = new Map(target.servers.map((server) => [server.name, server]));
  return source.servers.map((sourceServer) => {
    const targetServer = targetByName.get(sourceServer.name);
    if (!targetServer) {
      return { name: sourceServer.name, kind: "add", source: sourceServer };
    }
    const kind: ClassificationKind = areServersEqual(sourceServer, targetServer)
      ? "unchanged"
      : "conflict";
    return { name: sourceServer.name, kind, source: sourceServer, target: targetServer };
  });
}
