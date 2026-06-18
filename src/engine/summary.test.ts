import { describe, expect, it } from "vitest";
import { classify } from "./classify.js";
import { isNoOp, summarize } from "./summary.js";
import type { NormalizedConfig } from "../model/types.js";

describe("summarize", () => {
  it("counts additions, unchanged entries, and conflicts by resolution", () => {
    const source: NormalizedConfig = {
      servers: [
        { name: "added", transport: "stdio", command: "node" },
        { name: "same", transport: "stdio", command: "node" },
        { name: "kept", transport: "stdio", command: "source" },
        { name: "taken", transport: "stdio", command: "source" },
      ],
    };
    const target: NormalizedConfig = {
      servers: [
        { name: "same", transport: "stdio", command: "node" },
        { name: "kept", transport: "stdio", command: "target" },
        { name: "taken", transport: "stdio", command: "target" },
      ],
    };
    const classifications = classify(source, target);
    const summary = summarize(classifications, {
      kept: "accept-target",
      taken: "accept-source",
    });

    expect(summary).toEqual({
      added: { count: 1, names: ["added"] },
      unchanged: { count: 1, names: ["same"] },
      conflicts: {
        total: 2,
        acceptTarget: { count: 1, names: ["kept"] },
        acceptSource: { count: 1, names: ["taken"] },
      },
    });
  });
});

describe("isNoOp", () => {
  it("is true when there are no classifications", () => {
    expect(isNoOp([])).toBe(true);
  });

  it("is true when every entry is unchanged", () => {
    const config: NormalizedConfig = { servers: [{ name: "foo", transport: "stdio", command: "node" }] };
    expect(isNoOp(classify(config, config))).toBe(true);
  });

  it("is false when there is an addition", () => {
    const source: NormalizedConfig = { servers: [{ name: "foo", transport: "stdio", command: "node" }] };
    const target: NormalizedConfig = { servers: [] };
    expect(isNoOp(classify(source, target))).toBe(false);
  });
});
