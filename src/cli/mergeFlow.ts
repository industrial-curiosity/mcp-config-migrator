import * as p from "@clack/prompts";
import { unwrap } from "./cancel.js";
import { editText } from "./editor.js";
import type { ClassifiedEntry } from "../engine/classify.js";
import { renderMergeScaffold } from "../engine/diff.js";
import { MergeValidationError, parseMergedServer } from "../engine/mergeParse.js";
import type { NormalizedMcpServer } from "../model/types.js";

type FixOrRedo = "fix" | "redo";

/**
 * Opens the conflict merge editor for `entry` and loops until the user
 * produces a valid combined definition or cancels.
 */
export async function resolveMergeConflict(
  entry: ClassifiedEntry,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): Promise<NormalizedMcpServer> {
  const original = renderMergeScaffold(entry);
  let current = original;

  for (;;) {
    const edited = await editText(current, env, platform);
    try {
      return parseMergedServer(entry.name, edited);
    } catch (err) {
      if (!(err instanceof MergeValidationError)) throw err;
      current = edited;
      p.log.error(err.message);
      const choice = await p.select<FixOrRedo>({
        message: "Resolve the error:",
        options: [
          { value: "fix", label: "Fix — reopen the editor with your edits kept" },
          { value: "redo", label: "Redo — reopen the editor reset to the original conflict markers" },
        ],
      });
      if (unwrap(choice) === "redo") {
        current = original;
      }
    }
  }
}
