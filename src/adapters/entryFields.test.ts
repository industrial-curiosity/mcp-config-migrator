import { describe, expect, it } from "vitest";
import { entryToNormalized, normalizedToEntry } from "./entryFields.js";

describe("entryToNormalized", () => {
  it("parses a stdio entry and falls back to the default transport when type is omitted", () => {
    const server = entryToNormalized(
      "foo",
      { command: "node", args: ["server.js"], cwd: "/app", env: { TOKEN: "x" } },
      "cursor",
      "stdio",
    );
    expect(server).toEqual({
      name: "foo",
      transport: "stdio",
      command: "node",
      args: ["server.js"],
      cwd: "/app",
      env: { TOKEN: "x" },
    });
  });

  it("parses a remote entry with explicit type", () => {
    const server = entryToNormalized(
      "foo",
      { type: "http", url: "https://example.com", headers: { Authorization: "Bearer x" } },
      "cursor",
    );
    expect(server).toEqual({
      name: "foo",
      transport: "http",
      url: "https://example.com",
      headers: { Authorization: "Bearer x" },
    });
  });

  it("stashes unrecognized fields in the extra bag, tagged with the source IDE", () => {
    const server = entryToNormalized(
      "foo",
      { type: "stdio", command: "node", sandboxEnabled: true },
      "vscode",
    );
    expect(server.extra).toEqual({ sourceIdeId: "vscode", fields: { sandboxEnabled: true } });
  });
});

describe("normalizedToEntry", () => {
  it("omits type for stdio when includeType is false", () => {
    const { entry } = normalizedToEntry(
      { name: "foo", transport: "stdio", command: "node" },
      "cursor",
      false,
    );
    expect(entry).toEqual({ command: "node" });
  });

  it("includes type for stdio when includeType is true", () => {
    const { entry } = normalizedToEntry(
      { name: "foo", transport: "stdio", command: "node" },
      "vscode",
      true,
    );
    expect(entry).toEqual({ type: "stdio", command: "node" });
  });

  it("always includes type for remote transports regardless of includeType", () => {
    const { entry } = normalizedToEntry(
      { name: "foo", transport: "http", url: "https://example.com" },
      "cursor",
      false,
    );
    expect(entry).toEqual({ type: "http", url: "https://example.com" });
  });

  it("re-emits extra fields when round-tripping through the same IDE", () => {
    const { entry, droppedFields } = normalizedToEntry(
      {
        name: "foo",
        transport: "stdio",
        command: "node",
        extra: { sourceIdeId: "vscode", fields: { sandboxEnabled: true } },
      },
      "vscode",
      true,
    );
    expect(entry).toEqual({ type: "stdio", command: "node", sandboxEnabled: true });
    expect(droppedFields).toEqual([]);
  });

  it("drops and reports extra fields from a different IDE", () => {
    const { entry, droppedFields } = normalizedToEntry(
      {
        name: "foo",
        transport: "stdio",
        command: "node",
        extra: { sourceIdeId: "vscode", fields: { sandboxEnabled: true } },
      },
      "cursor",
      false,
    );
    expect(entry).toEqual({ command: "node" });
    expect(droppedFields).toEqual(["sandboxEnabled"]);
  });
});
