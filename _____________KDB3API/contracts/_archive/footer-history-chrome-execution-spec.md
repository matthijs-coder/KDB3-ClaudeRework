# Execution Spec: footer history chrome (`footer_chromeChange`)

> Execute after `header-footer-history-bootstrap-execution-spec.md` (collect + staging) is complete.
> Contract delta: `_____________KDB3API/contracts/footer-history-contractdelta.md`

---

**Status:** `Draft`
**Contract delta:** `_____________KDB3API/contracts/footer-history-contractdelta.md`
**Phase:** `footer history chrome`
**Depends on:** `header-footer-history-bootstrap-execution-spec.md`
**Authoring AI:** Auto, 2026-05-21
**Executing AI:** `<pending>`
**Reviewer:** `<pending CP-2>`

**CP-1 approved:**

- `footer_chromeChange` step key; uniform `{ target, value }` shape.
- Internal replay via `applyFooterHistoryReplay`; no new public `_KDB.api.footer` methods.
- Replay `source: "api"`.
- Replay to `footer.status: "active"` returns `false` when `readHeaderStatus(_KDB) !== "active"`.
- Replay to `"idle"` returns `false`.
- Automatic `footer/hide` from `header:confirmedChanged` with `source: "bootstrap"` does **not** push a footer step.
- Header undo to active does **not** auto-restore footer.
- kdbControl sync via footer effects → `frameworkBindContext.syncView()` after replay.

---

## Section A. Pre-flight read list

Echo one sentence per item before editing:

1. `_____________KDB3API/contracts/footer-history-contractdelta.md` — step model and cascade rules.
2. `_____________KDB3API/contracts/footer.md` — footer status semantics and header guard.
3. `_____________KDB3API/contracts/header-footer-history-bootstrap-contractdelta.md` — staged contribution and collect keys.
4. `_____________KDB3API/KDB3/js/dashboard/footer/state/createFooterReducer.js` — toggle/show/hide transitions.
5. `_____________KDB3API/KDB3/js/dashboard/footer/createFooterController.js` — dispatch, bootstrap hide, mount.
6. `_____________KDB3API/KDB3/js/dashboard/footer/effects/__orchestratorFooterEffects.js` — DOM sync; no syncView today.
7. `_____________KDB3API/KDB3/js/dashboard/footer/state/selectors.js` — `readHeaderStatus` guard.
8. `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkKdbActionToggles.js` — `footer.toggle` proxy only.
9. `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/framework/syncFrameworkViewFromState.js` — footer checkbox reads `readFooterStatus`.
10. `_____________KDB3API/KDB3/js/core/services/historyService/replay/applyHistoryStep.js` — handler boundary returns boolean.
11. `_____________KDB3API/.cursor/rules/state.mdc` — footer owns `_KDB.state.footer` only.
12. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — dispatch surface unchanged.

---

## Section B. Scope

Implement footer Fußzeile status history commit + replay for `footer_chromeChange`.

In scope:

- `footer/history/*` helpers: snapshot, build step, maybe push, `applyFooterHistoryReplay`, wire `createFooterHistoryReplayHandler`.
- Push `footer_chromeChange` after user-initiated status change (`source` is `kdbControl` or `api`, not `bootstrap`).
- Replay via internal `applyFooterHistoryReplay` using explicit show/hide semantics and `source: "api"`.
- Footer effects call kdbControl `syncView()` after successful replay (and after user dispatch that changes footer status if checkbox should stay in sync).
- Header guard on replay activate.

Out of scope:

- Header history, combined header+footer steps, text steps.
- kdbControl pushing footer steps.
- Changing `historyService` or `collectReplayHandlers` (except if bootstrap incomplete).
- Event catalog changes.
- `TEST/`, legacy, rules.

---

## Section C. Expected file changes

```txt
_____________KDB3API/KDB3/js/dashboard/footer/history/isFooterHistoryTrackedTarget.js
_____________KDB3API/KDB3/js/dashboard/footer/history/readFooterHistorySnapshot.js
_____________KDB3API/KDB3/js/dashboard/footer/history/buildFooterHistoryStep.js
_____________KDB3API/KDB3/js/dashboard/footer/history/maybePushFooterHistoryStep.js
_____________KDB3API/KDB3/js/dashboard/footer/history/applyFooterHistoryReplay.js
_____________KDB3API/KDB3/js/dashboard/footer/history/createFooterHistoryReplayHandler.js
_____________KDB3API/KDB3/js/dashboard/footer/history/stageFooterHistoryReplayHandler.js
_____________KDB3API/KDB3/js/dashboard/footer/createFooterController.js
_____________KDB3API/KDB3/js/dashboard/footer/effects/__orchestratorFooterEffects.js
```

Do not edit `KDB.js`, `kdbControl`, `historyService` internals, or contracts.

---

## Section D. Step model (implementation)

**Key:** `footer_chromeChange`

**Envelope:** always `{ target, value }` on `old` and `new` (never raw scalar at top level).

```js
{
  key: "footer_chromeChange",
  timestamp: number,
  old: { target: "footer.status", value: "removed" },
  new: { target: "footer.status", value: "active" }
}
```

**`value` for `footer.status`:** string `"idle" | "active" | "removed"`.

---

## Section E. Per-file specification

### `history/isFooterHistoryTrackedTarget.js`

- Return true only for `footer.status`.

### `history/readFooterHistorySnapshot.js`

- Input: footer state object, target string.
- Output: `{ target: "footer.status", value: <status string> }`.

### `history/buildFooterHistoryStep.js`

- Build step from old/new snapshots; key `footer_chromeChange`.

### `history/maybePushFooterHistoryStep.js`

- Call after confirmed footer state change in controller dispatch path.
- Skip when `options.skipHistory` or `options.isHistoryReplay`.
- Skip when `payload.source === "bootstrap"` (covers `onHeaderConfirmed` auto-hide).
- Skip when snapshot unchanged.
- One warn per page if `_KDB.services.history` missing.

### `history/applyFooterHistoryReplay.js`

- Input: `_KDB`, `{ target, value, direction, step }` from handler.
- Validate `target === "footer.status"` and string value.
- Map replay apply (internal owner route, not public API):
  - `"active"` → dispatch or internal path equivalent to `footer/show` with `{ source: "api", skipHistory: true, isHistoryReplay: true }`.
  - `"removed"` → `footer/hide` with same replay options.
  - `"idle"` → return `false` (no reset action in reducer).
- Before activate: if desired `"active"` and `readHeaderStatus(_KDB) !== "active"`, log focused warning, return `false`.
- Must not mutate `_KDB.state.header`.
- Return `true` only when reducer accepted change and effects ran.

### `history/createFooterHistoryReplayHandler.js`

- `apply(_KDB, targetValue, step, context)` → `applyFooterHistoryReplay` with `targetValue` = `step.old` or `step.new` (`{ target, value }`).

### `createFooterController.js`

- After `reduce` + state write + `_footerEffects`, call `maybePushFooterHistoryStep` for user dispatches only (bootstrap path already uses `dispatch` with `source: "bootstrap"` — excluded by maybePush).
- Pass replay options on internal replay dispatches only (applyFooterHistoryReplay owns options).
- Do not push on `onHeaderConfirmed` hide.

### `effects/__orchestratorFooterEffects.js`

- After DOM sync, if action carried `isHistoryReplay === true` OR footer status changed on user dispatch, call:

```js
var ctx = _KDB.runtime.kdbControl && _KDB.runtime.kdbControl.frameworkBindContext;
if (ctx && typeof ctx.syncView === "function") ctx.syncView();
```

- Guard with try/catch at effect boundary per `error-handling.mdc`.
- Do not write kdbControl state.

---

## Section F. Acceptance Criteria

1. User `footer.toggle` from kdbControl (`source: "kdbControl"`) creates one `footer_chromeChange` step when status changes.
2. Header removal auto `footer/hide` (`source: "bootstrap"`) creates **no** footer step.
3. Undo restores previous `footer.status` and DOM when header is active (for activate replay).
4. Redo restores forward status.
5. Replay to active with header not active returns `false`, no throw.
6. Replay creates no new stack entry.
7. kdbControl Fußzeile checkbox matches `readFooterStatus` after undo/redo.
8. Undo header chrome step does **not** by itself restore footer to previous active without a separate footer step on stack.

---

## Section G. Forbidden Actions

- Do not push footer history from kdbControl.
- Do not import `historyService/replay/*` in footer files.
- Do not add public footer registration methods.
- Do not use `footer/toggle` for replay (explicit show/hide/set only).
- Do not auto-restore footer when header undo runs.

---

## Section H. Verification Hints

```txt
Toggle footer on -> stack length +1, pointer at new step.
Remove header while footer active -> footer hidden, no new footer step.
Undo footer toggle -> checkbox + DOM match old status.
With header removed, redo footer activate step -> false.
grep maybePushFooterHistoryStep bootstrap skip.
```

---

## Section I. Reporting Template

1. Pre-flight echo.
2. File checklist.
3. Sample committed step JSON for toggle.
4. Replay status active for `footer_chromeChange`.
5. Cascade behavior observed (header undo / footer restore).
6. syncView wired in footer effects (yes/no).
7. ReadLints + forbidden searches.
8. Deviations.
