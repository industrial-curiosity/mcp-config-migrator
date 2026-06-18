#!/usr/bin/env node
import { runCli } from "./flow.js";

try {
  await runCli();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
