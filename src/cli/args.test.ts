import { describe, expect, it } from "vitest";
import { parseArgs } from "./args.js";

describe("parseArgs", () => {
  it("returns migrate for no arguments", () => {
    expect(parseArgs([])).toEqual({ kind: "migrate" });
  });

  it.each(["--help", "-h", "/?"])("returns help for %s", (flag) => {
    expect(parseArgs([flag])).toEqual({ kind: "help" });
  });

  it("returns restore with no file path when called bare", () => {
    expect(parseArgs(["restore"])).toEqual({ kind: "restore", filePath: undefined });
  });

  it.each(["--file", "-f"])("returns restore with the file path after %s", (flag) => {
    expect(parseArgs(["restore", flag, "/tmp/versions.json"])).toEqual({
      kind: "restore",
      filePath: "/tmp/versions.json",
    });
  });

  it("returns config-backup for 'config backup'", () => {
    expect(parseArgs(["config", "backup"])).toEqual({ kind: "config-backup" });
  });

  it("falls back to help for unrecognized input", () => {
    expect(parseArgs(["bogus"])).toEqual({ kind: "help" });
    expect(parseArgs(["config", "bogus"])).toEqual({ kind: "help" });
  });
});
