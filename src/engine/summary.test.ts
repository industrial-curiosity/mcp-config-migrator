import { describe, expect, it } from "vitest";
import { classify } from "./classify.js";
import { isNoOp, summarize, type ManualEdits } from "./summary.js";
import type { NormalizedConfig } from "../model/types.js";

const noEdits: ManualEdits = { edited: new Set(), skipped: new Set() };

describe("summarize", () => {
  it("counts additions, unchanged entries, and conflicts by resolution (no ManualEdits)", () => {
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
      kept: { kind: "accept-target" },
      taken: { kind: "accept-source" },
    });

    expect(summary).toEqual({
      added: { count: 1, names: ["added"] },
      unchanged: { count: 1, names: ["same"] },
      skipped: { count: 0, names: [] },
      conflicts: {
        total: 2,
        acceptTarget: { count: 1, names: ["kept"] },
        acceptSource: { count: 1, names: ["taken"] },
        merged: { count: 0, names: [] },
      },
    });
  });

  it("counts a merge resolution under the merged category", () => {
    const source: NormalizedConfig = {
      servers: [{ name: "combined", transport: "stdio", command: "source" }],
    };
    const target: NormalizedConfig = {
      servers: [{ name: "combined", transport: "stdio", command: "target" }],
    };
    const classifications = classify(source, target);
    const summary = summarize(classifications, {
      combined: { kind: "merge", merged: { name: "combined", transport: "stdio", command: "hand-merged" } },
    });

    expect(summary.skipped).toEqual({ count: 0, names: [] });
    expect(summary.conflicts).toEqual({
      total: 1,
      acceptTarget: { count: 0, names: [] },
      acceptSource: { count: 0, names: [] },
      merged: { count: 1, names: ["combined"] },
    });
  });

  it("explicit noEdits ManualEdits produces same result as no third argument", () => {
    const source: NormalizedConfig = {
      servers: [{ name: "foo", transport: "stdio", command: "node" }],
    };
    const classifications = classify(source, { servers: [] });
    const withoutArg = summarize(classifications, {});
    const withNoEdits = summarize(classifications, {}, noEdits);
    expect(withoutArg).toEqual(withNoEdits);
  });

  describe("ManualEdits reclassification", () => {
    it("skipped add entry goes to skipped, not added", () => {
      const source: NormalizedConfig = {
        servers: [{ name: "newserver", transport: "stdio", command: "node" }],
      };
      const classifications = classify(source, { servers: [] });
      const summary = summarize(classifications, {}, {
        edited: new Set(),
        skipped: new Set(["newserver"]),
      });

      expect(summary.added).toEqual({ count: 0, names: [] });
      expect(summary.skipped).toEqual({ count: 1, names: ["newserver"] });
    });

    it("skipped unchanged entry goes to skipped, not unchanged", () => {
      const config: NormalizedConfig = {
        servers: [{ name: "same", transport: "stdio", command: "node" }],
      };
      const classifications = classify(config, config);
      const summary = summarize(classifications, {}, {
        edited: new Set(),
        skipped: new Set(["same"]),
      });

      expect(summary.unchanged).toEqual({ count: 0, names: [] });
      expect(summary.skipped).toEqual({ count: 1, names: ["same"] });
    });

    it("skipped conflict entry goes to skipped regardless of resolution", () => {
      const source: NormalizedConfig = {
        servers: [{ name: "conflict", transport: "stdio", command: "source" }],
      };
      const target: NormalizedConfig = {
        servers: [{ name: "conflict", transport: "stdio", command: "target" }],
      };
      const classifications = classify(source, target);
      const summary = summarize(classifications, { conflict: { kind: "accept-target" } }, {
        edited: new Set(),
        skipped: new Set(["conflict"]),
      });

      expect(summary.conflicts.total).toBe(0);
      expect(summary.skipped).toEqual({ count: 1, names: ["conflict"] });
    });

    it("edited unchanged entry moves to conflicts.merged", () => {
      const config: NormalizedConfig = {
        servers: [{ name: "same", transport: "stdio", command: "node" }],
      };
      const classifications = classify(config, config);
      const summary = summarize(classifications, {}, {
        edited: new Set(["same"]),
        skipped: new Set(),
      });

      expect(summary.unchanged).toEqual({ count: 0, names: [] });
      expect(summary.conflicts.merged).toEqual({ count: 1, names: ["same"] });
    });

    it("edited conflict accept-target entry moves to conflicts.merged", () => {
      const source: NormalizedConfig = {
        servers: [{ name: "conflict", transport: "stdio", command: "source" }],
      };
      const target: NormalizedConfig = {
        servers: [{ name: "conflict", transport: "stdio", command: "target" }],
      };
      const classifications = classify(source, target);
      const summary = summarize(classifications, { conflict: { kind: "accept-target" } }, {
        edited: new Set(["conflict"]),
        skipped: new Set(),
      });

      expect(summary.conflicts.acceptTarget).toEqual({ count: 0, names: [] });
      expect(summary.conflicts.merged).toEqual({ count: 1, names: ["conflict"] });
    });

    it("edited add entry stays in added", () => {
      const source: NormalizedConfig = {
        servers: [{ name: "newserver", transport: "stdio", command: "node" }],
      };
      const classifications = classify(source, { servers: [] });
      const summary = summarize(classifications, {}, {
        edited: new Set(["newserver"]),
        skipped: new Set(),
      });

      expect(summary.added).toEqual({ count: 1, names: ["newserver"] });
      expect(summary.skipped).toEqual({ count: 0, names: [] });
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
