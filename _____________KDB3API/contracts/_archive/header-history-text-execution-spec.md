# Execution Spec: `header` history text (`header_textChange`)

> Execute after the header chrome history tranche is green.
> Contract delta: `_____________KDB3API/contracts/header-history-contractdelta.md` (text tranche only; §4.2, §6.3 text rows, §13 text criteria).

---

**Status:** `Draft`
**Contract delta:** `_____________KDB3API/contracts/header-history-contractdelta.md`
**Phase:** `header history text`
**Depends on:** implemented `header_chromeChange` handler and `collectReplayHandlers()` registration for `header_textChange`
**Authoring AI:** GPT-5.5, 2026-05-21
**Executing AI:** `<pending>`
**Reviewer:** `<pending CP-2>`

---

## Section A. Pre-flight read list

The executing AI must read each file below and echo one sentence per item before editing:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB.*` namespaces and no legacy aliases.
2. `_____________KDB3API/.cursor/rules/state.mdc` — header is canonical writer for `_KDB.state.header`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — no new runtime resources expected.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no public header API additions.
5. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — small focused files and 150-line hard limit.
6. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names and canonical action names.
7. `_____________KDB3API/.cursor/rules/error-handling.mdc` — no new broad try/catch; replay returns false on malformed input.
8. `_____________KDB3API/.cursor/rules/amd.mdc` — AMD dependency arrays and factory params stay aligned.
9. `_____________KDB3API/contracts/header-history-contractdelta.md` — approved text history contract.
10. `_____________KDB3API/KDB3/js/dashboard/header/state/createHeaderReducer.js`
11. `_____________KDB3API/KDB3/js/dashboard/header/history/readHeaderHistorySnapshot.js`
12. `_____________KDB3API/KDB3/js/dashboard/header/history/buildHeaderHistoryStep.js`
13. `_____________KDB3API/KDB3/js/dashboard/header/history/maybePushHeaderHistoryStep.js`
14. `_____________KDB3API/KDB3/js/dashboard/header/history/applyHeaderHistoryReplay.js`
15. `_____________KDB3API/KDB3/js/dashboard/header/history/createHeaderHistoryReplayHandler.js`

First output must be the summaries. If any summary is generic or missing, stop and re-read.

---

## Section B. Scope

Implement only `header_textChange`:

```txt
header.titleText
header.subtitleText
```

Out of scope:

- Header chrome behavior changes.
- Footer behavior changes.
- kdbControl behavior changes.
- historyService changes.
- collectReplayHandlers changes.
- edit-start/cancel history.
- public API changes.

---

## Section C. Expected file changes

Required:

```txt
KDB3/js/dashboard/header/state/createHeaderReducer.js
KDB3/js/dashboard/header/history/readHeaderHistorySnapshot.js
KDB3/js/dashboard/header/history/buildHeaderHistoryStep.js
KDB3/js/dashboard/header/history/maybePushHeaderHistoryStep.js
KDB3/js/dashboard/header/history/applyHeaderHistoryReplay.js
KDB3/js/dashboard/header/history/createHeaderHistoryReplayHandler.js
```

Expected no changes:

```txt
KDB3/js/core/services/collectReplayHandlers.js
KDB3/js/core/services/historyService/
KDB3/js/dashboard/header/createHeaderController.js
KDB3/js/dashboard/header/effects/
KDB3/js/dashboard/footer/
KDB3/js/dashboard/canvas/kdbControl/
KDB3/js/KDB.js
```

If one of the expected no-change files appears necessary, stop and report before editing.

---

## Section D. Per-file specification

### `header/state/createHeaderReducer.js`

- **Role:** header state reducer.
- **Add explicit replay-only actions:**

```txt
header/setTitleText
header/setSubtitleText
```

- **`header/setTitleText` behavior:**
  - Read `payload.titleText`.
  - Normalize with the same title normalization used by `header/commitTitle`.
  - If current `titleText` already equals desired value and no edit session needs clearing, return `state`.
  - Set `titleText`.
  - Clear edit session fields via existing helper.
  - Return normalized inactive state using existing helper.

- **`header/setSubtitleText` behavior:**
  - Read `payload.subtitleText` and `payload.subtitleStatus`.
  - Normalize subtitle text with existing subtitle normalization.
  - If desired text is empty or desired status is `"removed"`, set `subtitleStatus = "removed"` and `subtitleText = ""`.
  - Otherwise set `subtitleStatus = "active"` and `subtitleText` to normalized text.
  - If current text/status already equal desired value and no edit session needs clearing, return `state`.
  - Clear edit session fields via existing helper.
  - Return normalized inactive state using existing helper.

- **Do not change behavior of:**
  - `header/commitTitle`
  - `header/commitSubtitle`
  - `header/startTitleEdit`
  - `header/startSubtitleEdit`
  - `header/cancelEdit`
  - chrome actions.

- **Rules to apply:** `state.mdc` (pure reducer, owner writes only), `module-public-api.mdc` (no public API additions), `amd.mdc`.

### `header/history/readHeaderHistorySnapshot.js`

- **Role:** read serializable header history target snapshots.
- **Required behavior:** extend supported targets:

```txt
header.titleText
header.subtitleText
```

- **Snapshot shapes:**

```js
{ target: "header.titleText", value: { titleText: string } }
{ target: "header.subtitleText", value: { subtitleText: string, subtitleStatus: "active" | "removed" } }
```

- Normalize `subtitleStatus` to `"active"` or `"removed"`.
- Preserve existing chrome snapshot behavior.
- **Rules to apply:** `state.mdc` (read-only helper), `amd.mdc`.

### `header/history/buildHeaderHistoryStep.js`

- **Role:** build serializable header history step.
- **Required behavior:**
  - Preserve `header_chromeChange` for chrome targets.
  - Return `header_textChange` when target is:

```txt
header.titleText
header.subtitleText
```

  - Keep uniform shape:

```js
{
  key: "header_textChange",
  old: { target, value },
  new: { target, value }
}
```

- Do not create steps for mixed old/new targets.
- **Rules to apply:** `state.mdc` (serializable data only), `amd.mdc`.

### `header/history/maybePushHeaderHistoryStep.js`

- **Role:** decide whether to push a header history step after confirmed owner change.
- **Required behavior:**
  - Preserve chrome behavior.
  - Add target resolution:
    - `header/commitTitle` -> `header.titleText`
    - `header/commitSubtitle` -> `header.subtitleText`
  - Respect existing `skipHistory` and `isHistoryReplay` guards.
  - Read old/new snapshots through `readHeaderHistorySnapshot`.
  - Push only when old/new snapshots differ.
  - Do not push for `header/startTitleEdit`, `header/startSubtitleEdit`, or `header/cancelEdit`.

- **Rules to apply:** `state.mdc` (only uses history service API, no direct history state writes), `module-public-api.mdc`, `amd.mdc`.

### `header/history/applyHeaderHistoryReplay.js`

- **Role:** apply header history snapshots through header-owned replay route.
- **Required behavior:**
  - Preserve chrome replay behavior.
  - Add text target replay:

```txt
header.titleText -> dispatch/action with type "header/setTitleText"
header.subtitleText -> dispatch/action with type "header/setSubtitleText"
```

  - Do not dispatch `header/commitTitle` or `header/commitSubtitle`.
  - Do not open or fake an edit session.
  - Add replay action options:

```js
{
  skipHistory: true,
  isHistoryReplay: true,
  forceApply: true
}
```

  - Use `payload.source = "api"`.
  - Return `false` for malformed payloads.

- **Rules to apply:** `state.mdc`, `module-public-api.mdc`, `error-handling.mdc` (false return on malformed replay), `amd.mdc`.

### `header/history/createHeaderHistoryReplayHandler.js`

- **Role:** staged replay handler contribution.
- **Required behavior:**
  - Remove the `header_textChange` stub that returns `false`.
  - Route both `header_chromeChange` and `header_textChange` to `applyHeaderHistoryReplay`.
  - Reject unknown step keys with `false`.
  - Pass `{ target, value, direction, step }` as currently done for chrome.

- **Rules to apply:** `runtime.mdc` (handler contribution shape), `module-public-api.mdc` (no public registration API), `amd.mdc`.

---

## Section E. Acceptance Criteria

1. `header/commitTitle` pushes one `header_textChange` step when `titleText` changes.
2. `header/commitSubtitle` pushes one `header_textChange` step when `subtitleText` or `subtitleStatus` changes.
3. Start edit, switch edit target without text change, and cancel edit push no history step.
4. Undo/redo for title text restores `_KDB.state.header.titleText` and header DOM.
5. Undo/redo for non-empty subtitle text restores `_KDB.state.header.subtitleText`, `subtitleStatus`, and header DOM.
6. Undo/redo for empty subtitle commit restores `subtitleText === ""` and `subtitleStatus === "removed"` when appropriate.
7. Replay does not call `commitTitle`, `commitSubtitle`, or `toggleSubtitle`.
8. Replay creates no new history step.
9. Existing `header_chromeChange` behavior remains green.
10. No `historyService`, `collectReplayHandlers`, footer, kdbControl, or KDB.js files are modified.
11. No public APIs are added.
12. No touched file exceeds 150 lines.
13. `ReadLints` is clean on touched files.

---

## Section F. Forbidden Actions

- Do not add a new public method to `_KDB.api.header`.
- Do not add `_KDB.history`.
- Do not modify `historyService`.
- Do not modify `collectReplayHandlers`.
- Do not modify `KDB.js`.
- Do not modify footer or kdbControl files.
- Do not use `header/commitTitle` or `header/commitSubtitle` for replay.
- Do not use `header/toggleSubtitle` for text replay.
- Do not add `"historyReplay"` source enum.
- Do not edit legacy trees, TEST harnesses, rules or templates.

---

## Section G. Manual Smoke Checklist

1. Edit header title -> commit -> undo -> redo.
2. Edit subtitle to non-empty value -> commit -> undo -> redo.
3. Edit subtitle to empty value -> commit -> undo -> redo, confirm `subtitleStatus` restoration.
4. Start edit then cancel/no text change -> no history step.
5. Confirm no extra step during undo/redo.
6. Confirm no handler missing for `header_textChange`.
7. Re-check Kopfzeile and Untertitel chrome undo/redo.

---

## Section H. Reporting Template

The executing AI reports:

1. Pre-flight echo.
2. File checklist with line counts.
3. Reducer actions added.
4. Snapshot shapes added.
5. Replay mapping added.
6. ReadLints result.
7. Acceptance criteria pass/fail.
8. Deviations or open questions.
