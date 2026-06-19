import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { ClassifiedEntry } from "../engine/classify.js";

const { CANCEL } = vi.hoisted(() => ({ CANCEL: Symbol("cancel") }));

vi.mock("@clack/prompts", () => ({
  isCancel: (value: unknown) => value === CANCEL,
  select: vi.fn(),
  log: { error: vi.fn() },
}));

vi.mock("./editor.js", () => ({ editText: vi.fn() }));

import * as p from "@clack/prompts";
import { editText } from "./editor.js";
import { resolveMergeConflict } from "./mergeFlow.js";
import { CliCancelled } from "./cancel.js";

const select = p.select as unknown as Mock;
const logError = p.log.error as unknown as Mock;
const editTextMock = editText as unknown as Mock;

const conflict: ClassifiedEntry = {
  name: "foo",
  kind: "conflict",
  source: { name: "foo", transport: "stdio", command: "source-cmd" },
  target: { name: "foo", transport: "stdio", command: "target-cmd" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveMergeConflict", () => {
  it("returns the parsed entry when the first edit is valid", async () => {
    editTextMock.mockResolvedValueOnce(
      '{\n  "transport": "stdio",\n  "command": "hand-merged"\n}\n',
    );

    const result = await resolveMergeConflict(conflict, {}, "linux");

    expect(result).toEqual({ name: "foo", transport: "stdio", command: "hand-merged" });
    expect(select).not.toHaveBeenCalled();
  });

  it("reports leftover conflict markers and reopens with the user's edits on Fix", async () => {
    const withMarkers = "<<<<<<< target\nstuff\n=======\nmore\n>>>>>>> source\n";
    editTextMock
      .mockResolvedValueOnce(withMarkers)
      .mockResolvedValueOnce('{\n  "transport": "stdio",\n  "command": "fixed"\n}\n');
    select.mockResolvedValueOnce("fix");

    const result = await resolveMergeConflict(conflict, {}, "linux");

    expect(logError).toHaveBeenCalledWith(expect.stringContaining("conflict markers"));
    expect(result).toEqual({ name: "foo", transport: "stdio", command: "fixed" });
    expect(editTextMock).toHaveBeenNthCalledWith(2, withMarkers, {}, "linux");
  });

  it("reports invalid JSON and reopens reset to the original scaffold on Redo", async () => {
    editTextMock
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce('{\n  "transport": "stdio",\n  "command": "redone"\n}\n');
    select.mockResolvedValueOnce("redo");

    const result = await resolveMergeConflict(conflict, {}, "linux");

    expect(logError).toHaveBeenCalledWith(expect.stringContaining("Invalid JSON"));
    expect(result).toEqual({ name: "foo", transport: "stdio", command: "redone" });
    const originalScaffold = editTextMock.mock.calls[0]![0];
    expect(editTextMock).toHaveBeenNthCalledWith(2, originalScaffold, {}, "linux");
  });

  it("propagates cancellation when the user cancels the fix-or-redo prompt", async () => {
    editTextMock.mockResolvedValueOnce("not json");
    select.mockResolvedValueOnce(CANCEL);

    await expect(resolveMergeConflict(conflict, {}, "linux")).rejects.toBeInstanceOf(CliCancelled);
  });
});
