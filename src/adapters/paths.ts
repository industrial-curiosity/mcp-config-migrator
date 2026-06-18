import { posix, win32 } from "node:path";

export function homeDir(env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string {
  if (platform === "win32") return env.USERPROFILE ?? env.HOME ?? "";
  return env.HOME ?? "";
}

/**
 * `node:path`'s default `join` follows the host OS's separator, not the
 * `platform` we're computing a default path for — a Mac host can still
 * suggest a Windows default. Pick the matching `path` flavor explicitly.
 */
export function joinForPlatform(platform: NodeJS.Platform, ...segments: string[]): string {
  return (platform === "win32" ? win32 : posix).join(...segments);
}
