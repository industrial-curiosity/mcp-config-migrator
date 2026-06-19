## 1. Settings and versions store

- [x] 1.1 Add `src/model/versionsStore.ts` defining the settings/versions file shape (`{ configured, backupLocation?, versions? }`, version entries `{ timestamp, ideId, scopeId, path, servers }`) and a function to resolve the effective store path (canonical `~/mcp-config-migrator.versions.json`, or the file named by its `backupLocation` if set).
- [x] 1.2 Add `readVersionsStore()`/`writeVersionsStore()` (or equivalent) to load the resolved store (defaulting `configured` to `"alwaysAsk"` and `versions` to `[]` when the file or fields are absent) and persist it back as pretty-printed JSON.
- [x] 1.3 Add `appendVersion(entry)` that appends to the resolved store's `versions` array without mutating or removing existing entries.
- [x] 1.4 Add tests covering: missing file defaults, `backupLocation` redirecting reads/writes to a different file, and append-only behavior across multiple calls.

## 2. Remove the automatic whole-file backup

- [x] 2.1 Delete `src/model/backup.ts` (`backupFile`) and its test file.
- [x] 2.2 Delete `src/engine/write.ts` (`saveWithBackup`) and its test file; update `src/cli/flow.ts`'s write site to call `targetAdapter.save()` directly.
- [x] 2.3 Remove the `saveResult.backupPath` log line in `src/cli/flow.ts` (no longer produced by a direct `adapter.save()` call).

## 3. Backup decision step in the migrate flow

- [x] 3.1 Add a backup-decision function (e.g. in `src/cli/backupFlow.ts`) that reads the persisted `configured` value and: appends silently for `"alwaysOn"`, skips silently for `"alwaysOff"`, or prompts for `"alwaysAsk"` with `p.select` options in order "Yes", "Yes, always" (default-selected), "No", "No, never". Only "Yes, always" and "No, never" write a new `configured` value (`"alwaysOn"`/`"alwaysOff"`); plain "Yes" and plain "No" decide this run only and leave `configured` at `"alwaysAsk"`.
- [x] 3.2 Wire this into `src/cli/flow.ts`'s `runFlow()` between the write confirmation and the write itself, using the already-loaded pre-merge `targetConfig` plus `targetAdapter.id`/`target.scopeId`/`target.path` as the entry to back up.
- [ ] 3.3 Add tests in `src/cli/flow.test.ts` (or a new `backupFlow.test.ts`) covering all three preference states and all four prompt choices, including that plain "Yes"/"No" do not change the persisted `configured` value.

## 4. Restore command

- [x] 4.1 Add `src/cli/restoreFlow.ts` with a `runRestore(options)` entry point: resolves the store (from an explicit `filePath` or by prompting with the canonical default), lists every version newest-first as `<timestamp> — <IDE label> (<scope label>) — <path>` via `p.select`, previews the selected entry's servers via `p.note`, and on confirmation calls the matching adapter's `save()` with `{ servers: entry.servers }`.
- [x] 4.2 Ensure restoring never mutates the versions array (`runRestore` never calls any versions-store write function — it only reads via `readVersionsStore` and writes through the target IDE adapter's `save()`).
- [x] 4.3 Add tests covering: listing/ordering, preview-then-confirm, restoring writes to the right adapter/path, and that the stored versions list is unchanged after a restore.

## 5. `config backup` command

- [x] 5.1 Add `src/cli/configBackupFlow.ts` that shows the current `configured` value and effective storage location, offers a `p.select` to change `configured`, and a `p.text` (default = current location) to change `backupLocation` (clearing it when set back to the canonical path).
- [x] 5.2 Add tests covering: viewing current settings, changing the preference, and changing/clearing the storage location.

## 6. Command-line dispatch and help

- [x] 6.1 Add `src/cli/args.ts` with a pure function parsing `process.argv.slice(2)` into one of: migrate (no args), `restore` (with optional `--file`/`-f <path>`), `config backup`, or help (`--help`/`-h`/`/?`).
- [x] 6.2 Update `src/cli/index.ts` to dispatch based on the parsed command, calling the existing `runCli()` for migrate and the new flows from tasks 4–5 otherwise.
- [x] 6.3 Add help output listing all four invocation forms.
- [x] 6.4 Add tests for `src/cli/args.ts` covering each recognized form and unrecognized input.

## 7. Docs and spec sync

- [x] 7.1 Confirm the delta specs in this change's `specs/` correctly capture the removed pre-write backup requirement and the new `backup-and-restore` capability, ready to land in `openspec/specs/` at archive time.
- [x] 7.2 Update README.md and docs/spec.md to reflect any user-facing or architectural changes introduced by this change
