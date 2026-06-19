import * as p from "@clack/prompts";

export class CliCancelled extends Error {}

export function unwrap<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    throw new CliCancelled();
  }
  return value;
}
