# Add Iterative Server Editor Tasks

## 1. Shared Server Management

- [x] 1.1 Replace the pre-summary multiselect with an iterative single-server menu that redraws after each edit or deletion and returns the final config plus edit/delete tracking.
- [x] 1.2 Preserve the existing normalized JSON editor, skip signal, validation, and fix-or-redo behavior in the shared manager.
- [x] 1.3 Update unit tests for the manager to cover finish-without-changes, repeat editing, deletion removing a later menu option, empty configurations, cancellation, and validation retry behavior.

## 2. Migration Flow Integration

- [x] 2.1 Integrate the shared manager into migration before the summary and retain correct `ManualEdits` summary classification.
- [x] 2.2 Remove the post-write cleanup prompt and its extra save, ensuring migration deletion is represented before confirmation.
- [x] 2.3 Update migration-flow tests for iterative edit/delete behavior, summary accounting, write confirmation, backup behavior, and removal of post-write cleanup.

## 3. Direct Edit Command

- [x] 3.1 Extend command parsing, help output, and dispatch with the `edit` command while preserving no-argument migration behavior.
- [x] 3.2 Implement the direct-edit flow using existing IDE/scope/path selection, adapter loading, the shared manager, an edit/delete summary, confirmation, backup, target-specific notices, and surgical save.
- [x] 3.3 Add argument-parser and direct-edit-flow tests for successful edit, deletion, no changes, declined confirmation, and cancellation without writes or backups.

## 4. Verification and Documentation

- [x] 4.1 Run the relevant unit tests, type check, lint, and OpenSpec validation; resolve any failures.
- [x] 4.2 Update README.md and docs/spec.md to reflect any user-facing or architectural changes introduced by this change
