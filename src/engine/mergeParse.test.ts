import { describe, expect, it } from "vitest";
import { MergeValidationError, hasUnresolvedMarkers, parseMergedServer } from "./mergeParse.js";

describe("hasUnresolvedMarkers", () => {
  it("detects each marker style", () => {
    expect(hasUnresolvedMarkers('<<<<<<< target\n{}\n=======\n{}\n>>>>>>> source\n')).toBe(true);
    expect(hasUnresolvedMarkers('{\n  "transport": "stdio"\n}\n')).toBe(false);
  });
});

describe("parseMergedServer", () => {
  it("parses a valid stdio entry", () => {
    const text = '{\n  "transport": "stdio",\n  "command": "node",\n  "args": ["a"]\n}\n';
    expect(parseMergedServer("foo", text)).toEqual({
      name: "foo",
      transport: "stdio",
      command: "node",
      args: ["a"],
    });
  });

  it("parses a valid remote entry", () => {
    const text = '{\n  "transport": "http",\n  "url": "https://example.com",\n  "headers": {"X": "1"}\n}\n';
    expect(parseMergedServer("foo", text)).toEqual({
      name: "foo",
      transport: "http",
      url: "https://example.com",
      headers: { X: "1" },
    });
  });

  it("rejects text with leftover conflict markers", () => {
    const text = '<<<<<<< target\n{"transport":"stdio"}\n=======\n{"transport":"stdio"}\n>>>>>>> source\n';
    expect(() => parseMergedServer("foo", text)).toThrow(MergeValidationError);
    expect(() => parseMergedServer("foo", text)).toThrow(/conflict markers/);
  });

  it("rejects invalid JSON", () => {
    expect(() => parseMergedServer("foo", "{not json")).toThrow(MergeValidationError);
  });

  it("rejects an unrecognized transport", () => {
    expect(() => parseMergedServer("foo", '{"transport": "carrier-pigeon"}')).toThrow(/transport/);
  });

  it("rejects fields not valid for the entry's transport", () => {
    expect(() => parseMergedServer("foo", '{"transport": "stdio", "url": "https://x"}')).toThrow(
      /Unrecognized field/,
    );
  });

  it("rejects a wrongly-typed field", () => {
    expect(() => parseMergedServer("foo", '{"transport": "stdio", "args": "not-an-array"}')).toThrow(
      /"args" must be/,
    );
  });
});
