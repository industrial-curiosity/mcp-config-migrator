import { describe, expect, it } from "vitest";
import { classify } from "./classify.js";
import { renderConflictDiff } from "./diff.js";
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
