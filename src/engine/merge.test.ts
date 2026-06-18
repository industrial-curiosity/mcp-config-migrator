import { describe, expect, it } from "vitest";
import { classify } from "./classify.js";
import { applyMerge } from "./merge.js";
import type { NormalizedConfig } from "../model/types.js";

describe("applyMerge", () => {
  it("includes added entries, keeps unchanged entries, and preserves target-only entries", () => {
    const source: NormalizedConfig = {
      servers: [{ name: "added", transport: "stdio", command: "node" }],
    };
    const target: NormalizedConfig = {
      servers: [{ name: "target-only", transport: "stdio", command: "deno" }],
    };
    const classifications = classify(source, target);
    const merged = applyMerge(target, classifications, {});

    expect(merged.servers).toHaveLength(2);
    expect(merged.servers.find((s) => s.name === "added")).toBeDefined();
    expect(merged.servers.find((s) => s.name === "target-only")).toBeDefined();
  });

  it.each([
    ["accept-target", "target-version"],
    ["accept-source", "source-version"],
  ] as const)("resolves a conflict with %s to %s", (resolution, expectedCommand) => {
    const source: NormalizedConfig = {
      servers: [{ name: "foo", transport: "stdio", command: "source-version" }],
    };
    const target: NormalizedConfig = {
      servers: [{ name: "foo", transport: "stdio", command: "target-version" }],
    };
    const classifications = classify(source, target);
    const merged = applyMerge(target, classifications, { foo: resolution });

    expect(merged.servers.find((s) => s.name === "foo")?.command).toBe(expectedCommand);
  });
});
