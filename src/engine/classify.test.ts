import { describe, expect, it } from "vitest";
import { classify } from "./classify.js";
import type { NormalizedConfig, NormalizedMcpServer } from "../model/types.js";

function server(overrides: Partial<NormalizedMcpServer> = {}): NormalizedMcpServer {
  return { name: "foo", transport: "stdio", command: "node", ...overrides };
}

describe("classify", () => {
  it("classifies a source-only entry as add", () => {
    const source: NormalizedConfig = { servers: [server()] };
    const target: NormalizedConfig = { servers: [] };
    expect(classify(source, target)).toEqual([
      { name: "foo", kind: "add", source: source.servers[0] },
    ]);
  });

  it("classifies identical entries as unchanged", () => {
    const source: NormalizedConfig = { servers: [server()] };
    const target: NormalizedConfig = { servers: [server()] };
    const [entry] = classify(source, target);
    expect(entry?.kind).toBe("unchanged");
  });

  it("classifies differing entries with the same name as conflict", () => {
    const source: NormalizedConfig = { servers: [server({ command: "node" })] };
    const target: NormalizedConfig = { servers: [server({ command: "deno" })] };
    const [entry] = classify(source, target);
    expect(entry?.kind).toBe("conflict");
    expect(entry?.target?.command).toBe("deno");
  });

  it("does not surface target-only entries", () => {
    const source: NormalizedConfig = { servers: [] };
    const target: NormalizedConfig = { servers: [server({ name: "target-only" })] };
    expect(classify(source, target)).toEqual([]);
  });
});
