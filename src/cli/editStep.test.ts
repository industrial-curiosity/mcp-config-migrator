import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const { CANCEL } = vi.hoisted(() => ({ CANCEL: Symbol("cancel") }));

vi.mock("@clack/prompts", () => ({
  isCancel: (value: unknown) => value === CANCEL,
  multiselect: vi.fn(),
  select: vi.fn(),
  log: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("./editor.js", () => ({ editText: vi.fn() }));

import * as p from "@clack/prompts";
import { editText } from "./editor.js";
import { editMergedServers, isSkipSignal, SKIP_HEADER } from "./editStep.js";
import type { NormalizedConfig } from "../model/types.js";

const multiselect = p.multiselect as unknown as Mock;
const select = p.select as unknown as Mock;
const logInfo = p.log.info as unknown as Mock;
const editTextMock = editText as unknown as Mock;

const serverA: NormalizedConfig["servers"][0] = { name: "alpha", transport: "stdio", command: "node" };
const serverB: NormalizedConfig["servers"][0] = { name: "beta", transport: "stdio", command: "python" };
const merged: NormalizedConfig = { servers: [serverA, serverB] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isSkipSignal", () => {
  it("returns true for empty string", () => {
    expect(isSkipSignal("")).toBe(true);
  });

  it("returns true for whitespace-only content", () => {
    expect(isSkipSignal("   \n  ")).toBe(true);
  });

  it("returns true for empty braces", () => {
    expect(isSkipSignal("{}")).toBe(true);
  });

  it("returns true for empty braces with internal whitespace", () => {
    expect(isSkipSignal("{  }")).toBe(true);
  });

  it("returns true for header followed by empty content", () => {
    expect(isSkipSignal(`${SKIP_HEADER}\n`)).toBe(true);
  });

  it("returns true for header followed by whitespace", () => {
    expect(isSkipSignal(`${SKIP_HEADER}\n   \n`)).toBe(true);
  });

  it("returns true for header followed by empty braces", () => {
    expect(isSkipSignal(`${SKIP_HEADER}\n{}`)).toBe(true);
  });

  it("returns false for a real JSON object", () => {
    expect(isSkipSignal('{"transport":"stdio","command":"node"}')).toBe(false);
  });

  it("returns false for header followed by real JSON", () => {
    expect(isSkipSignal(`${SKIP_HEADER}\n{"transport":"stdio"}`)).toBe(false);
  });
});

describe("editMergedServers", () => {
  it("returns unchanged config and empty ManualEdits when no servers are selected", async () => {
    multiselect.mockResolvedValueOnce([]);

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig).toEqual(merged);
    expect(result.manualEdits.edited.size).toBe(0);
    expect(result.manualEdits.skipped.size).toBe(0);
    expect(editTextMock).not.toHaveBeenCalled();
  });

  it("returns unchanged config and empty ManualEdits when multiselect is cancelled", async () => {
    multiselect.mockResolvedValueOnce(CANCEL);

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig).toEqual(merged);
    expect(result.manualEdits.edited.size).toBe(0);
  });

  it("returns unchanged config without prompting when merged has no servers", async () => {
    const empty: NormalizedConfig = { servers: [] };
    const result = await editMergedServers(empty, {}, "linux");

    expect(multiselect).not.toHaveBeenCalled();
    expect(result.updatedConfig).toEqual(empty);
  });

  it("uses the required prompt message", async () => {
    multiselect.mockResolvedValueOnce([]);
    await editMergedServers(merged, {}, "linux");

    expect(multiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Edit any server before writing? (clear the editor to skip a server — none required)",
      }),
    );
  });

  it("opens editor with correct first line for each selected server", async () => {
    multiselect.mockResolvedValueOnce(["alpha"]);
    editTextMock.mockResolvedValueOnce('{\n  "transport": "stdio",\n  "command": "edited"\n}\n');

    await editMergedServers(merged, {}, "linux");

    const editorContent: string = editTextMock.mock.calls[0]![0];
    expect(editorContent.split("\n")[0]).toBe(SKIP_HEADER);
  });

  it("updates config and records name in edited set when server is validly edited", async () => {
    multiselect.mockResolvedValueOnce(["alpha"]);
    editTextMock.mockResolvedValueOnce('{\n  "transport": "stdio",\n  "command": "edited-cmd"\n}\n');

    const result = await editMergedServers(merged, {}, "linux");

    const updatedAlpha = result.updatedConfig.servers.find((s) => s.name === "alpha");
    expect(updatedAlpha?.command).toBe("edited-cmd");
    expect(result.manualEdits.edited.has("alpha")).toBe(true);
    expect(result.manualEdits.skipped.size).toBe(0);
  });

  it("removes server from config and records in skipped set when editor is cleared (empty file)", async () => {
    multiselect.mockResolvedValueOnce(["alpha"]);
    editTextMock.mockResolvedValueOnce("");

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig.servers.find((s) => s.name === "alpha")).toBeUndefined();
    expect(result.manualEdits.skipped.has("alpha")).toBe(true);
    expect(result.manualEdits.edited.has("alpha")).toBe(false);
  });

  it("treats whitespace-only content as a skip signal", async () => {
    multiselect.mockResolvedValueOnce(["alpha"]);
    editTextMock.mockResolvedValueOnce("   \n\n");

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig.servers.find((s) => s.name === "alpha")).toBeUndefined();
    expect(result.manualEdits.skipped.has("alpha")).toBe(true);
  });

  it("treats empty braces as a skip signal, not a validation error", async () => {
    multiselect.mockResolvedValueOnce(["alpha"]);
    editTextMock.mockResolvedValueOnce("{}");

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig.servers.find((s) => s.name === "alpha")).toBeUndefined();
    expect(result.manualEdits.skipped.has("alpha")).toBe(true);
    // must NOT trigger fix-or-redo
    expect(select).not.toHaveBeenCalled();
  });

  it("logs a confirmation message when a server is skipped", async () => {
    multiselect.mockResolvedValueOnce(["alpha"]);
    editTextMock.mockResolvedValueOnce("");

    await editMergedServers(merged, {}, "linux");

    expect(logInfo).toHaveBeenCalledWith("Skipped: alpha");
  });

  it("triggers fix-or-redo loop on invalid JSON and succeeds on fix", async () => {
    multiselect.mockResolvedValueOnce(["alpha"]);
    const invalid = "not json";
    const valid = '{\n  "transport": "stdio",\n  "command": "fixed"\n}\n';
    editTextMock.mockResolvedValueOnce(invalid).mockResolvedValueOnce(valid);
    select.mockResolvedValueOnce("fix");

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig.servers.find((s) => s.name === "alpha")?.command).toBe("fixed");
    expect(result.manualEdits.edited.has("alpha")).toBe(true);
    expect(editTextMock).toHaveBeenCalledTimes(2);
    expect(editTextMock).toHaveBeenNthCalledWith(2, invalid, {}, "linux");
  });

  it("resets to original on redo in fix-or-redo loop", async () => {
    multiselect.mockResolvedValueOnce(["alpha"]);
    const original = editTextMock.mock
      ? (editTextMock.mock.calls[0]?.[0] as string | undefined)
      : undefined;

    editTextMock
      .mockResolvedValueOnce("not json")
      .mockImplementationOnce(async () => '{\n  "transport": "stdio",\n  "command": "redone"\n}\n');
    select.mockResolvedValueOnce("redo");

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig.servers.find((s) => s.name === "alpha")?.command).toBe("redone");
    // The second editText call should have received the original scaffold, not the invalid content
    const secondCallContent: string = editTextMock.mock.calls[1]![0];
    expect(secondCallContent.split("\n")[0]).toBe(SKIP_HEADER);
    void original;
  });

  it("preserves servers not selected for editing", async () => {
    multiselect.mockResolvedValueOnce(["alpha"]);
    editTextMock.mockResolvedValueOnce('{\n  "transport": "stdio",\n  "command": "edited-cmd"\n}\n');

    const result = await editMergedServers(merged, {}, "linux");

    const beta = result.updatedConfig.servers.find((s) => s.name === "beta");
    expect(beta).toEqual(serverB);
  });
});
