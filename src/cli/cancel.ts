import * as p from "@clack/prompts";

export class CliCancelled extends Error {}

export function unwrap<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    throw new CliCancelled();
  }
  return value;
}

/** Runs `fn`, turning a `CliCancelled` thrown anywhere inside it into a clean "Cancelled." message. */
export async function withCancelHandling(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof CliCancelled) {
      p.cancel("Cancelled.");
      return;
    }
    throw err;
  }
}
