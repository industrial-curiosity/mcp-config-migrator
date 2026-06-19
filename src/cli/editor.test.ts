import { describe, expect, it, vi } from "vitest";
import { resolveEditorCommand, editText } from "./editor.js";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));

import { spawnSync } from "node:child_process";

const spawnSyncMock = spawnSync as unknown as ReturnType<typeof vi.fn>;

describe("resolveEditorCommand", () => {
  it("prefers $VISUAL over $EDITOR and the platform default", () => {
    expect(resolveEditorCommand({ VISUAL: "code-visual", EDITOR: "nano" }, "linux")).toBe("code-visual");
  });

  it("falls back to $EDITOR when $VISUAL is unset", () => {
    expect(resolveEditorCommand({ EDITOR: "nano" }, "linux")).toBe("nano");
  });

  it("falls back to vi on POSIX platforms when neither is set", () => {
    expect(resolveEditorCommand({}, "darwin")).toBe("vi");
  });

  it("falls back to notepad on win32 when neither is set", () => {
    expect(resolveEditorCommand({}, "win32")).toBe("notepad");
  });
});

describe("editText", () => {
  it("writes the text to a temp file, invokes the resolved editor, and returns the file's contents", async () => {
    spawnSyncMock.mockImplementation(() => ({ status: 0, error: undefined }));

    const result = await editText("original content\n", { EDITOR: "fake-editor" }, "linux");

    expect(result).toBe("original content\n");
    expect(spawnSyncMock).toHaveBeenCalledWith(
      expect.stringMatching(/^fake-editor ".*entry\.json"$/),
      { shell: true, stdio: "inherit" },
    );
  });

  it("throws when the editor fails to launch", async () => {
    spawnSyncMock.mockImplementation(() => ({ status: null, error: new Error("ENOENT") }));

    await expect(editText("content\n", { EDITOR: "missing-editor" }, "linux")).rejects.toThrow(
      /Failed to launch editor/,
    );
  });

  it("throws when the editor exits with a non-zero status", async () => {
    spawnSyncMock.mockImplementation(() => ({ status: 1, error: undefined }));

    await expect(editText("content\n", { EDITOR: "fake-editor" }, "linux")).rejects.toThrow(
      /exited with status 1/,
    );
  });
});
