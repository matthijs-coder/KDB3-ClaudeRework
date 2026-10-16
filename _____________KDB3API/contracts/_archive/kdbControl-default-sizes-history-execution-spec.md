# Execution Spec: `kdbControl` default sizes history

> Execute only after CP-1 approval of `kdbControl-default-sizes-history-contractdelta.md`.
> This is a small scope expansion inside the existing `kdbControl_settingsChange` history path.

---

**Status:** `Draft`
**Contract delta:** `_____________KDB3API/contracts/kdbControl-default-sizes-history-contractdelta.md`
**Phase:** `kdbControl default size targets`
**Authoring AI:** GPT-5.5, 2026-05-21
**Executing AI:** `<pending>`
**Reviewer:** `<pending CP-2>`

---

## Section A. Pre-flight read list

The executing AI must read each file below and echo one sentence per item before editing:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB.*` namespaces and ownership map.
2. `_____________KDB3API/.cursor/rules/state.mdc` — serializable state, canonical writers and no foreign state writes.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — runtime resources and cleanup; this tranche should not add runtime resources.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no public API changes.
5. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — focused files and line limits.
6. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names and canonical target naming.
7. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables touched by this tranche; reducers and pure one-liner helpers exempt.
8. `_____________KDB3API/.cursor/rules/amd.mdc` — AMD dependency arrays and factory parameters one-to-one.
9. `_____________KDB3API/contracts/kdbControl-history-contractdelta.md` — existing kdbControl history behavior.
10. `_____________KDB3API/contracts/kdbControl-default-sizes-history-contractdelta.md` — approved scope expansion.
11. `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/history/isHistoryTrackedSettingsTarget.js`
12. `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/history/resolveHistoryTargetFromAction.js`
13. `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/history/readSettingsTargetSnapshot.js`
14. `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/history/applyControlSettingsHistoryReplay.js`

First output must be the 14 summaries. If any summary is generic or missing, stop and re-read.

---

## Section B. Scope

Add history tracking and replay mapping for exactly four targets:

```txt
defaults.visualization.width
defaults.visualization.height
defaults.text.width
defaults.text.height
```

Keep existing step key:

```txt
kdbControl_settingsChange
```

No new services, handlers, public APIs, events, runtime buckets, bootstrap changes or canvas effects.

---

## Section C. Expected file changes

Required:

```txt
_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/history/isHistoryTrackedSettingsTarget.js
_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/history/resolveHistoryTargetFromAction.js
_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/history/readSettingsTargetSnapshot.js
_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/history/applyControlSettingsHistoryReplay.js
```

Do not modify unless the reviewer explicitly approves a deviation:

```txt
KDB3/js/dashboard/canvas/kdbControl/createKdbControlController.js
KDB3/js/dashboard/canvas/kdbControl/history/maybePushSettingsHistoryStep.js
KDB3/js/dashboard/canvas/kdbControl/history/buildControlSettingsHistoryStep.js
KDB3/js/core/services/historyService/
KDB3/js/core/services/collectReplayHandlers.js
KDB3/js/KDB.js
```

---

## Section D. Per-file specification

### `isHistoryTrackedSettingsTarget.js`

- **Role:** tracked target allowlist.
- **Required change:** add exactly these keys to `TRACKED`:

```js
"defaults.visualization.width": 1,
"defaults.visualization.height": 1,
"defaults.text.width": 1,
"defaults.text.height": 1
```

- **Rules to apply:** `state.mdc` (declarative target allowlist only), `naming.mdc` (canonical English target keys), `amd.mdc`.

### `resolveHistoryTargetFromAction.js`

- **Role:** action-to-history-target resolver.
- **Required behavior:**
  - For `_eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT`:
    - `payload.field === "width"` -> `defaults.visualization.width`
    - `payload.field === "height"` -> `defaults.visualization.height`
    - `payload.field === "backgroundColor"` remains `defaults.visualizationBackgroundColor`
  - For `_eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT`:
    - `payload.field === "width"` -> `defaults.text.width`
    - `payload.field === "height"` -> `defaults.text.height`
    - `payload.field === "backgroundColor"` remains `defaults.textBackgroundColor`
- **No behavior change** for dashboard dimensions, colors or dashboard chrome.
- **Rules to apply:** `state.mdc` (resolve only, no writes), `naming.mdc`, `amd.mdc`.

### `readSettingsTargetSnapshot.js`

- **Role:** read serializable snapshot for a tracked settings target.
- **Required behavior:** add cases:

```js
case "defaults.visualization.width":
  return { value: readString(vis.width) };
case "defaults.visualization.height":
  return { value: readString(vis.height) };
case "defaults.text.width":
  return { value: readString(comment.width) };
case "defaults.text.height":
  return { value: readString(comment.height) };
```

- **Snapshot shape:** `{ value: string }`.
- **Rules to apply:** `state.mdc` (read-only helper), `module-public-api.mdc` (no public API), `amd.mdc`.

### `applyControlSettingsHistoryReplay.js`

- **Role:** convert history target snapshot into kdbControl replay action.
- **Required behavior:** add `buildReplayAction` branches:

```js
defaults.visualization.width
  -> ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT payload { field: "width", value: <string> }
defaults.visualization.height
  -> ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT payload { field: "height", value: <string> }
defaults.text.width
  -> ACTION_SETTINGS_SET_COMMENT_DEFAULT payload { field: "width", value: <string> }
defaults.text.height
  -> ACTION_SETTINGS_SET_COMMENT_DEFAULT payload { field: "height", value: <string> }
```

- Reuse the existing scalar extraction logic.
- Reject empty string dimensions the same way dashboard dimension replay rejects empty strings, if practical.
- Preserve existing validation:
  - target must be tracked;
  - value must be object;
  - step old/new target must match;
  - replay action gets `commitOptions.skipHistory`, `isHistoryReplay`, `forceApply`.
- **Rules to apply:** `module-public-api.mdc` (replay through owner apply route), `state.mdc` (no foreign writes), `amd.mdc`, `error-handling.mdc` (existing false-return boundary).

---

## Section E. Acceptance Criteria

1. Diagramme Breite change pushes `kdbControl_settingsChange` with target `defaults.visualization.width`.
2. Diagramme Höhe change pushes `kdbControl_settingsChange` with target `defaults.visualization.height`.
3. Kommentare Breite change pushes `kdbControl_settingsChange` with target `defaults.text.width`.
4. Kommentare Höhe change pushes `kdbControl_settingsChange` with target `defaults.text.height`.
5. Snapshots for all four targets are `{ value: string }`.
6. Undo/redo dispatches the correct existing kdbControl action type and payload.
7. Replay preserves `skipHistory`, `isHistoryReplay`, and `forceApply`.
8. Replay creates no new history step.
9. No `handler missing kdbControl_settingsChange` warning appears for these steps.
10. No historyService, bootstrap, header, footer, canvas or historyControls files are modified.
11. No public APIs are added.
12. No touched file exceeds 150 lines.
13. `ReadLints` is clean on touched files.

---

## Section F. Forbidden Actions

- Do not add a new step key.
- Do not modify `historyService`.
- Do not modify `collectReplayHandlers`.
- Do not modify `KDB.js`.
- Do not implement `_KDB.api.canvas`.
- Do not add widget/canvas application of default sizes.
- Do not modify header/footer history.
- Do not add public APIs.
- Do not add `_KDB.history`.
- Do not edit legacy trees, TEST harnesses, rules or templates.

---

## Section G. Manual Smoke Checklist

After implementation and lints:

1. Change Diagramme Breite -> undo -> redo.
2. Change Diagramme Höhe -> undo -> redo.
3. Change Kommentare Breite -> undo -> redo.
4. Change Kommentare Höhe -> undo -> redo.
5. Confirm stack grows only on user commits, not on undo/redo.
6. Confirm no `handler missing kdbControl_settingsChange`.
7. Confirm visible kdbControl inputs sync after replay.

---

## Section H. Reporting Template

The executing AI reports:

1. Pre-flight echo.
2. File checklist with line counts.
3. Exact targets added.
4. Replay action mapping added.
5. ReadLints result.
6. Acceptance criteria pass/fail.
7. Deviations or open questions.
