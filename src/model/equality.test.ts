import { describe, expect, it } from "vitest";
import { areServersEqual } from "./equality.js";
import type { NormalizedMcpServer } from "./types.js";

const base: NormalizedMcpServer = {
  name: "foo",
  transport: "stdio",
  command: "node",
  args: ["server.js"],
  env: { TOKEN: "abc" },
};

describe("areServersEqual", () => {
  it("treats identical entries as equal", () => {
    expect(areServersEqual(base, { ...base })).toBe(true);
  });

  it("ignores the extra bag, including a differing sourceIdeId", () => {
    const a: NormalizedMcpServer = { ...base, extra: { sourceIdeId: "vscode", fields: { x: 1 } } };
    const b: NormalizedMcpServer = { ...base, extra: { sourceIdeId: "cursor", fields: { y: 2 } } };
    expect(areServersEqual(a, b)).toBe(true);
  });

  it("detects a differing command", () => {
    expect(areServersEqual(base, { ...base, command: "deno" })).toBe(false);
  });

  it("detects differing args order", () => {
    expect(areServersEqual(base, { ...base, args: ["server.js", "--extra"] })).toBe(false);
  });

  it("detects differing env values", () => {
    expect(areServersEqual(base, { ...base, env: { TOKEN: "xyz" } })).toBe(false);
  });

  it("treats a missing optional field as different from an empty one", () => {
    const noArgs: NormalizedMcpServer = { ...base, args: undefined };
    expect(areServersEqual(base, noArgs)).toBe(false);
  });
});
