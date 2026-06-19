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
    [{ kind: "accept-target" } as const, "target-version"],
    [{ kind: "accept-source" } as const, "source-version"],
  ])("resolves a conflict with %o to %s", (resolution, expectedCommand) => {
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

  it("resolves a conflict with merge by using the merged entry directly", () => {
    const source: NormalizedConfig = {
      servers: [{ name: "foo", transport: "stdio", command: "source-version", args: ["a"] }],
    };
    const target: NormalizedConfig = {
      servers: [{ name: "foo", transport: "stdio", command: "target-version", cwd: "/tmp" }],
    };
    const classifications = classify(source, target);
    const mergedEntry = { name: "foo", transport: "stdio" as const, command: "hand-merged", args: ["a"] };
    const merged = applyMerge(target, classifications, {
      foo: { kind: "merge", merged: mergedEntry },
    });

    expect(merged.servers.find((s) => s.name === "foo")).toEqual(mergedEntry);
  });
});
