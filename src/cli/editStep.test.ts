import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const { CANCEL } = vi.hoisted(() => ({ CANCEL: Symbol("cancel") }));

vi.mock("@clack/prompts", () => ({
  isCancel: (value: unknown) => value === CANCEL,
  select: vi.fn(),
  log: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("./editor.js", () => ({ editText: vi.fn() }));

import * as p from "@clack/prompts";
import { editText } from "./editor.js";
import { editMergedServers, isSkipSignal, SKIP_HEADER } from "./editStep.js";
import type { NormalizedConfig } from "../model/types.js";

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
  it.each(["", "   \n  ", "{}", "{  }", `${SKIP_HEADER}\n`, `${SKIP_HEADER}\n{}`])("recognizes %j as a skip signal", (text) => {
    expect(isSkipSignal(text)).toBe(true);
  });

  it("does not treat a server definition as a skip signal", () => {
    expect(isSkipSignal(`${SKIP_HEADER}\n{"transport":"stdio","command":"node"}`)).toBe(false);
  });
});

describe("editMergedServers", () => {
  it("returns unchanged config when the user finishes immediately", async () => {
    select.mockResolvedValueOnce("done");

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig).toEqual(merged);
    expect(result.manualEdits.edited.size).toBe(0);
    expect(editTextMock).not.toHaveBeenCalled();
  });

  it("returns unchanged config when the menu is cancelled", async () => {
    select.mockResolvedValueOnce(CANCEL);

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig).toEqual(merged);
    expect(result.manualEdits.edited.size).toBe(0);
  });

  it("does not prompt when the config has no servers", async () => {
    const result = await editMergedServers({ servers: [] }, {}, "linux");

    expect(select).not.toHaveBeenCalled();
    expect(result.updatedConfig).toEqual({ servers: [] });
  });

  it("returns to the menu after an edit", async () => {
    select.mockResolvedValueOnce("alpha").mockResolvedValueOnce("done");
    editTextMock.mockResolvedValueOnce('{\n  "transport": "stdio",\n  "command": "edited"\n}\n');

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig.servers.find((server) => server.name === "alpha")?.command).toBe("edited");
    expect(result.manualEdits.edited.has("alpha")).toBe(true);
    expect(select).toHaveBeenCalledTimes(2);
    expect(editTextMock.mock.calls[0]![0].split("\n")[0]).toBe(SKIP_HEADER);
  });

  it("allows a server to be edited more than once", async () => {
    select.mockResolvedValueOnce("alpha").mockResolvedValueOnce("alpha").mockResolvedValueOnce("done");
    editTextMock
      .mockResolvedValueOnce('{"transport":"stdio","command":"first"}')
      .mockResolvedValueOnce('{"transport":"stdio","command":"second"}');

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig.servers.find((server) => server.name === "alpha")?.command).toBe("second");
  });

  it("removes a deleted server from later menu options", async () => {
    select.mockResolvedValueOnce("alpha").mockResolvedValueOnce("done");
    editTextMock.mockResolvedValueOnce("");

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig.servers.find((server) => server.name === "alpha")).toBeUndefined();
    expect(result.manualEdits.skipped.has("alpha")).toBe(true);
    expect(logInfo).toHaveBeenCalledWith("Skipped: alpha");
    expect(select.mock.calls[1]![0].options).not.toContainEqual(expect.objectContaining({ value: "alpha" }));
  });

  it("reopens invalid content on fix and preserves the editor behavior", async () => {
    select.mockResolvedValueOnce("alpha").mockResolvedValueOnce("fix").mockResolvedValueOnce("done");
    editTextMock
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce('{\n  "transport": "stdio",\n  "command": "fixed"\n}\n');

    const result = await editMergedServers(merged, {}, "linux");

    expect(result.updatedConfig.servers.find((server) => server.name === "alpha")?.command).toBe("fixed");
    expect(editTextMock).toHaveBeenNthCalledWith(2, "not json", {}, "linux");
  });
});
