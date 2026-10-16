# Execution Spec: `dashboardPdf` (`focus-mode exit/restore`)

> Cheap-AI implementation spec. Architectural decisions live in `contracts/dashboardPdf-focus-mode-exit-restore-contractdelta.md` and `contracts/dashboardPdf.md`. Do not invent behavior.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/dashboardPdf.md`
**Delta:** `_____________KDB3API/contracts/dashboardPdf-focus-mode-exit-restore-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6, 2026-08-27
**Executing AI:** composer 2.5 subagent
**Reviewer:** supervising captain (this session)

---

## Section A. Pre-flight read list

The executing AI **must** read each file below in order, **before** producing any output file. After reading, echo a one-sentence summary of each. Then implement immediately in the same turn (supervising AI accepts the echo as part of review; do not stop to wait for a human).

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc`
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/contracts/dashboardPdf.md`
13. `_____________KDB3API/contracts/dashboardPdf-focus-mode-exit-restore-contractdelta.md`
14. This execution spec itself.

Also read (implementation inputs, not extra summaries):

- `_____________KDB3API/KDB3/js/core/services/dashboardPdf/runDashboardPdfExport.js`
- `_____________KDB3API/KDB3/js/core/services/dashboardPdf/effects/restoreOriginalTab.js`
- `_____________KDB3API/KDB3/js/core/services/dashboardPdf/effects/manageCaptureChrome.js` (pattern for factory-scope helpers + object return)
- `_____________KDB3API/KDB3/js/dashboard/widgets/widgetSettings/effects/buildDownstreamIntentAction.js` lines 78–86 only (`getState().byId[id].maximized` read pattern)

---

## Section B. Folder tree

```
_____________KDB3API/KDB3/js/core/services/dashboardPdf/
  effects/
    manageFocusModeForExport.js   (new)
  runDashboardPdfExport.js        (edit)
```

Do not create other folders or files.

---

## Section C. Per-file specifications

#### `effects/manageFocusModeForExport.js`

- **Role**: effect (named-method object: exit + restore)
- **Lines**: target 90–120 (hard 150)
- **AMD imports**: none (`define([], function () { ... })`)
- **Factory parameters**: none
- **Factory-scope named helpers** (all `function` declarations, never inside another function):

  - `function createFocusWarning(_code, _message, _details)` — return `{ code, message, details }` with `details` default `null`.
  - `function readWidgetVisApi(_KDB)` — return `_KDB.api.widgetVis` or `null` if missing.
  - `function isDispatchSuccess(_result)` — `true` iff `_result` is an object and `_result.ok === true`.
  - `function readMaximizedWidgetIds(_KDB)` — see body steps below.
  - `function dispatchMaximizeToggle(_KDB, _widgetId, _nextMaximized)` — async; see below.
  - `function exitFocusModeForExport(_KDB)` — async; public.
  - `function restoreFocusModeForExport(_KDB, _widgetIds)` — async; public.

- **Entry / return value**: `{ exitFocusModeForExport: exitFocusModeForExport, restoreFocusModeForExport: restoreFocusModeForExport }`

- **`readMaximizedWidgetIds(_KDB)` body**:
  1. `try/catch`. On catch: `console.error("[dashboardPdf.readMaximizedWidgetIds] failed", err)` then return `{ ok: true, widgetIds: [], warning: createFocusWarning("DASHBOARD_PDF_FOCUS_STATE_UNAVAILABLE", "widgetVis focus state could not be read.", { error: String(err && err.message ? err.message : err) }) }`.
  2. `api = readWidgetVisApi(_KDB)`. If `!api` or `typeof api.getState !== "function"`: same warning object (no `error` details required).
  3. `state = api.getState()`. If `state` is `undefined` or `null`: same warning.
  4. `byId = state.byId`. If `!byId` or typeof not object: return `{ ok: true, widgetIds: [], skipped: true }`.
  5. Build `widgetIds` from `Object.keys(byId)` in that order, including a key only when `byId[key] && byId[key].maximized === true`. Use a `for` loop, not `filter` with an inner function if that would nest a function inside `readMaximizedWidgetIds`. A factory-scope helper `function isRecordMaximized(_record)` is allowed if needed.
  6. Return `{ ok: true, widgetIds: widgetIds, skipped: widgetIds.length === 0 }`.

- **`dispatchMaximizeToggle(_KDB, _widgetId, _nextMaximized)` body**:
  1. `try/catch`. On catch: `console.error("[dashboardPdf.dispatchMaximizeToggle] failed", _widgetId, err)` then return `{ ok: false, widgetId: _widgetId, errorCode: "DASHBOARD_PDF_FOCUS_EXIT_FAILED", errorMessage: String(err && err.message ? err.message : err) }` — the caller maps restore failures separately; this helper is shared, so use a generic message string from the error, and let callers overwrite `errorCode` when needed. **Required:** return `{ ok: false, widgetId, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED", errorMessage }` on throw so callers can remap.
  2. `api = readWidgetVisApi(_KDB)`. If `!api` or `typeof api.dispatch !== "function"`: return `{ ok: false, widgetId: _widgetId, errorCode: "DASHBOARD_PDF_FOCUS_STATE_UNAVAILABLE", errorMessage: "widgetVis.dispatch is unavailable." }`.
  3. `result = await api.dispatch({ type: "widgetVis/maximizeToggle", widgetId: _widgetId, payload: { nextMaximized: _nextMaximized === true, source: "programmatic" } })`.
  4. If `isDispatchSuccess(result)` return `{ ok: true, widgetId: _widgetId, result: result }`.
  5. Else return `{ ok: false, widgetId: _widgetId, errorCode: result && result.errorCode ? result.errorCode : "WIDGET_VIS_MAXIMIZE_FAILED", errorMessage: result && result.errorMessage ? String(result.errorMessage) : "Focus mode toggle failed." }`.

- **`exitFocusModeForExport(_KDB)` body**:
  1. `try/catch`. On catch: `console.error("[dashboardPdf.exitFocusModeForExport] failed", err)` then return `{ ok: false, errorCode: "DASHBOARD_PDF_FOCUS_EXIT_FAILED", errorMessage: String(err && err.message ? err.message : err), widgetIds: [] }`.
  2. `snapshot = readMaximizedWidgetIds(_KDB)`.
  3. If `snapshot.warning`: return `{ ok: true, widgetIds: [], warning: snapshot.warning }` (do not dispatch).
  4. If `!snapshot.widgetIds || snapshot.widgetIds.length === 0`: return `{ ok: true, widgetIds: [], skipped: true }`.
  5. `exited = []`. `for` loop over `snapshot.widgetIds`. For each id: `toggle = await dispatchMaximizeToggle(_KDB, id, false)`. If `toggle.ok !== true`: `console.warn("[dashboardPdf.exitFocusModeForExport]", toggle)`; return `{ ok: false, errorCode: "DASHBOARD_PDF_FOCUS_EXIT_FAILED", errorMessage: toggle.errorMessage || "Focus mode exit failed.", widgetIds: exited, failedWidgetId: id }`.
  6. If `toggle.ok === true`: `exited.push(id)`.
  7. Return `{ ok: true, widgetIds: exited }`.

- **`restoreFocusModeForExport(_KDB, _widgetIds)` body**:
  1. `try/catch`. On catch: `console.error("[dashboardPdf.restoreFocusModeForExport] failed", err)` then return `{ ok: false, warning: createFocusWarning("DASHBOARD_PDF_FOCUS_RESTORE_FAILED", "Focus mode restore threw after PDF export.", { error: String(err && err.message ? err.message : err) }) }`.
  2. If `!Array.isArray(_widgetIds) || _widgetIds.length === 0`: return `{ ok: true, skipped: true }`.
  3. `failed = []`. `for` loop over `_widgetIds`. For each id: `toggle = await dispatchMaximizeToggle(_KDB, id, true)`. If `toggle.ok !== true`: `failed.push({ widgetId: id, errorCode: toggle.errorCode, errorMessage: toggle.errorMessage })`. Do **not** stop the loop.
  4. If `failed.length === 0`: return `{ ok: true }`.
  5. `warning = createFocusWarning("DASHBOARD_PDF_FOCUS_RESTORE_FAILED", "Focus mode restore failed after PDF export.", { failed: failed })`. `console.warn("[dashboardPdf.restoreFocusModeForExport]", warning)`. Return `{ ok: false, warning: warning }`.

- **Rules to apply**:
  - `amd.mdc` — one `define`; named helpers at factory scope; no nested `function` inside helpers; no ES modules; `async function` helpers at factory scope are allowed (same as tableData `runReloadTableLoadWork` pattern).
  - `naming.mdc` — English; underscore prefix only on boundary parameters (`_KDB`, `_widgetId`, `_nextMaximized`, `_widgetIds`, `_code`, `_message`, `_details`, `_result`, `_record`); local vars unprefixed.
  - `feature-structure.mdc` — `effects/` file; under 150 lines.
  - `module-public-api.mdc` — only `_KDB.api.widgetVis.getState` / `.dispatch`; no mixed commands invented on widgetVis.
  - `state.mdc` — no writes to `_KDB.state.widgets.vis` or any foreign subtree.
  - `runtime.mdc` — no reads/writes of `_KDB.runtime.widgetVis`.
  - `events.mdc` — no new events.
  - `error-handling.mdc` — try/catch on every named helper; boundaries return coded objects (do not rethrow); `console.error` with function tag; no silent catch.
  - `dom.mdc` — no DOM queries; no `.expandModeContainer` access.
  - `kdb-object.mdc` — `_KDB` as argument only; no `window._KDB` / `getKDB()`.

---

#### `runDashboardPdfExport.js` (edit)

- **Role**: export run coordinator
- **Lines**: keep ≤ 150 (currently 140). Target ≤ 148.
- **AMD imports** (exact new array, same order plus one new path after restoreOriginalTab):

```js
define([
  "./effects/readVisibleTabsManifest.js",
  "./effects/buildAttachmentRows.js",
  "./effects/renderAttachmentPages.js",
  "./effects/captureTabPage.js",
  "./effects/renderDashboardPages.js",
  "./effects/restoreOriginalTab.js",
  "./effects/manageFocusModeForExport.js"
], function (_readVisibleTabsManifest, _buildAttachmentRows, _renderAttachmentPages, _captureTabPage, _renderDashboardPages, _restoreOriginalTab, _manageFocusModeForExport) {
```

- **Do not** add other imports. Do not extract additional files if this edit stays ≤ 150 lines. If the file would exceed 150, stop and report; do not split on your own.

- **Body edits** (mechanical):

  1. In `runDashboardPdfExport`, with the existing `var` block, add:

     - `var focusExit = { ok: true, widgetIds: [] };`
     - `var focusRestore;`

  2. After the lines that assign `manifest.fileName`, `manifest.title`, `manifest.subtitle` and **before** `attachmentRows = await _buildAttachmentRows(...)`, insert:

```js
      focusExit = await _manageFocusModeForExport.exitFocusModeForExport(_KDB);
      if (focusExit.warning) warnings.push(focusExit.warning);
      if (!focusExit.ok) throw { code: focusExit.errorCode || "DASHBOARD_PDF_FOCUS_EXIT_FAILED", message: focusExit.errorMessage || "Focus mode exit failed." };
```

  3. Replace the `finally` block with:

```js
    } finally {
      restoreResult = await _restoreOriginalTab(_KDB, manifest.activeIndex, timeoutMs);
      focusRestore = await _manageFocusModeForExport.restoreFocusModeForExport(_KDB, focusExit.widgetIds);
      if (exportResult && exportResult.ok === true && restoreResult && restoreResult.ok !== true) {
        warnings.push(restoreResult.warning);
        exportResult.diagnostics = [restoreResult.warning];
      }
      if (exportResult && exportResult.ok === true && focusRestore && focusRestore.ok !== true && focusRestore.warning) {
        warnings.push(focusRestore.warning);
        exportResult.diagnostics = (exportResult.diagnostics || []).concat([focusRestore.warning]);
      }
    }
```

  4. Keep existing `try/catch` result mapping. Do not move restore into `createDashboardPdfService.js`.

- **Rules to apply**:
  - `amd.mdc` — keep one `define`; no new nested functions; 7 imports is a smell but allowed (under 10).
  - `naming.mdc` — `focusExit` / `focusRestore` camelCase, no underscore (locals).
  - `feature-structure.mdc` — hard 150 lines; flag if exceeded.
  - `error-handling.mdc` — failed exit throws coded object into existing catch (fatal, no PDF). Failed restore only attaches warning when `exportResult.ok === true`.
  - `state.mdc` / `module-public-api.mdc` — runner still does not write vis state; it only calls the new effect.
  - `runtime.mdc` — no new runtime buckets.

---

## Section D. Reducer behavior table

No reducer changes.

---

## Section E. Published selectors

None. dashboardPdf reads `widgetVis.getState()` only.

---

## Section F. Public API wiring

- Surface unchanged: `_KDB.services.dashboardPdf.exportDashboardPdf` / `destroy`.
- Consumer call: `_KDB.api.widgetVis.getState()` and `_KDB.api.widgetVis.dispatch`.
- No new `_KDB.runtime.dashboardPdf` keys.

---

## Section G. Harness HTML spec

Not used.

---

## Section H. Harness JS spec

Not used.

---

## Section I. Mock extensions

Not used.

---

## Section J. Acceptance criteria (self-verification before reporting back)

1. `manageFocusModeForExport.js` exists; `runDashboardPdfExport.js` is edited as specified.
2. Files match Section C, including `Rules to apply`.
3. Full-compact AMD `define`.
4. Neither file exceeds 150 lines.
5. No nested `function` inside another function.
6. dashboardPdf does not import widgetVis files. No `_KDB.state.widgets.vis` writes. No `_KDB.runtime.widgetVis` access. No DOM / `.expandModeContainer`.
7. Forbidden trees not read or modified (Section K).
8. Exit uses `nextMaximized: false`; restore uses `nextMaximized: true`; both `source: "programmatic"`; `widgetId` is a top-level action field.
9. `finally` restores tab first, then focus, including when export failed.
10. Failed exit returns `widgetIds` of widgets already exited so `finally` can restore them.
11. No contract files, CSS, or widgetVis JS modified.
12. Report uses Section L.

---

## Section K. Forbidden actions

- Modify any `.mdc` file under `_____________KDB3API/.cursor/rules/`.
- Modify `_____________KDB3API/contracts/_template.md` or `_executionSpecTemplate.md`.
- Modify `_____________KDB3API/contracts/dashboardPdf.md`, `widgetVis.md`, or the contract delta (coordinator already updated those).
- Modify `createDashboardPdfService.js`, `pdfExportControls`, widgetVis JS, or CSS.
- Read or modify `TEST/`, `_______KDB3/`, `_______REDESIGN2/`, `laatsteOriginal/`.
- Commit, push, or change git config.
- Invent a focused-widget PDF, extra enlarge page, or new widgetVis API methods.
- Skip Section A.

---

## Section L. Reporting template (for the executing AI)

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **File checklist** — path, line count, matches spec | deviation.
3. **Deviations** — path, deviation, motivation, rule.
4. **Self-verification** — pass/fail per Section J.
5. **Open questions for reviewer**.

---

## Section M. Reviewer handoff

Supervising captain: verify echo, read both JS files, `ReadLints`, accept / one fix-iteration / escalate.
