import { describe, expect, it } from "vitest";
import { classify } from "./classify.js";
import { renderConflictDiff, renderMergeScaffold } from "./diff.js";
import type { NormalizedConfig } from "../model/types.js";

describe("renderConflictDiff", () => {
  it("shows removed target lines and added source lines for a conflicting field", () => {
    const source: NormalizedConfig = {
      servers: [{ name: "foo", transport: "stdio", command: "source-cmd" }],
    };
    const target: NormalizedConfig = {
      servers: [{ name: "foo", transport: "stdio", command: "target-cmd" }],
    };
    const [entry] = classify(source, target);
    if (!entry) throw new Error("expected a classified entry");
    const rendered = renderConflictDiff(entry);

    expect(rendered).toMatch(/^- .*"command": "target-cmd"/m);
    expect(rendered).toMatch(/^\+ .*"command": "source-cmd"/m);
  });

  it("throws for a non-conflict entry", () => {
    const config: NormalizedConfig = { servers: [{ name: "foo", transport: "stdio", command: "node" }] };
    const [entry] = classify(config, config);
    if (!entry) throw new Error("expected a classified entry");
    expect(() => renderConflictDiff(entry)).toThrow();
  });
});

describe("renderMergeScaffold", () => {
  it("merges identical lines unmarked and wraps only the differing field in conflict markers", () => {
    const source: NormalizedConfig = {
      servers: [{ name: "foo", transport: "stdio", command: "source-cmd" }],
    };
    const target: NormalizedConfig = {
      servers: [{ name: "foo", transport: "stdio", command: "target-cmd" }],
    };
    const [entry] = classify(source, target);
    if (!entry) throw new Error("expected a classified entry");
    const rendered = renderMergeScaffold(entry);

    expect(rendered).toContain(
      '<<<<<<< target\n  "command": "target-cmd"\n=======\n  "command": "source-cmd"\n>>>>>>> source\n',
    );
    const transportIndex = rendered.indexOf('"transport"');
    const firstMarkerIndex = rendered.indexOf("<<<<<<<");
    expect(transportIndex).toBeGreaterThanOrEqual(0);
    expect(transportIndex).toBeLessThan(firstMarkerIndex);
  });

  it("wraps a field present only on one side with an empty section for the other", () => {
    const source: NormalizedConfig = {
      servers: [{ name: "foo", transport: "stdio", command: "node", args: ["x"] }],
    };
    const target: NormalizedConfig = {
      servers: [{ name: "foo", transport: "stdio", command: "node", cwd: "/tmp", args: ["x"] }],
    };
    const [entry] = classify(source, target);
    if (!entry) throw new Error("expected a classified entry");
    const rendered = renderMergeScaffold(entry);

    expect(rendered).toContain('<<<<<<< target\n  "cwd": "/tmp",\n=======\n>>>>>>> source\n');
    expect(rendered).toContain('"args"');
  });

  it("throws for a non-conflict entry", () => {
    const config: NormalizedConfig = { servers: [{ name: "foo", transport: "stdio", command: "node" }] };
    const [entry] = classify(config, config);
    if (!entry) throw new Error("expected a classified entry");
    expect(() => renderMergeScaffold(entry)).toThrow();
  });
});
