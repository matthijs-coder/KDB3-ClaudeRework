# Contract Delta: writeback T2 item 5c — honest canvasReady on activate

> **Superseded 2026-08-30.** SET activate skip/wait is tab-scoped inner-frame (`tabs-inner-frame-skip-empty-snapshot-contractdelta.md`). `whenCanvasReady` / `getCanvasWhenReady` are not per-tab proof. Do **not** implement `await awaitCanvasReady` or recreate `KDB3/js/dashboard/tabs/effects/awaitCanvasReady.js` from this file. writebackSet still consumes only `ok`.

> Closes deferred backlog §2.1 **only** for `tabs/parameterSetActivateTabRequested`
> (SET steps 18/23). After click + 150ms, await Cognos `getCanvasWhenReady`
> with a bounded cap. Global `waitFor: "canvas"` and step-28 widget paint
> stay as they are. Parent `tabs-parameterSetRestore-contractdelta.md` §5.2
> stays authoritative after the patch in this delta.

---

**Status:** `Superseded` — do not implement against this file. (PO vastenburg, 2026-08-17: GO 5c; 5a/5b not Cognos-green)
**Captain spec patch:** 2026-08-30 superseded: inner-frame replaced 5c; helper to be deleted; do not re-land.
**Parent:** `contracts/tabs-parameterSetRestore-contractdelta.md` §5.2, §8;
`contracts/writeback.md` §4.4 / §6.4 (activate before page-context / widgets)
**Depends on:** `_KDB.cognosAPI.async.getCanvasWhenReady` (already live);
T2-5a wait + T2-5b `clicked` on the same activate handler (do not regress)
**Type:** `feature module contract delta`
**Authoring AI:** planner (Grok 4.6), 2026-08-17
**Related:** `contracts/futureTodo/t2-parameterSet-gaps-launch-prompt.md` item 5
(slice **5c** only)

---

## 1. Purpose

Today `canvasReady: true` on activate means click + 150ms (PO D3). writebackSet
consumes only `ok`. Page-context restore then reads the host immediately
(backlog §2.4). This WP makes the **activate** acknowledgement wait for the
Cognos canvas lazyload promise, without force-rendering vis widgets and
without changing PDF/GET/mutation traverse.

This is **not** the full legacy per-widget `whenRenderComplete` model. That
is already `waitFor: "widgetsRendered"` on step 28.

---

## 2. PO decisions (2026-08-17)

| # | Choice | Decision |
|---|---|---|
| 1 | T2 item 5 split | **5c only.** Do not mark 5a/5b Cognos-done. |
| 2 | Where | **Only** `tabs/parameterSetActivateTabRequested` after a successful traverse click. |
| 3 | Global `waitFor: "canvas"` | **Unchanged** (click + 150ms). PDF, GET `collectWidgets`, tab mutation, `ensureSlotReadyForMutation`, `ensureRevealTakeTarget` keep today’s traverse. |
| 4 | `waitFor: "widgetsRendered"` on activate | **No.** Force-renders vis before step-27 binding; wrong for step-18 page-context filters. |
| 5 | Primitive | `_KDB.cognosAPI.async.getCanvasWhenReady`. Not `cognosAPI.canvas.*`. Not widgetBase `waitForCanvasTransferReady` (unbounded, wrong owner). No DOM scrape. No `Promise.race`. |
| 6 | Cap | **2500 ms** local `withCap` / `setTimeout` (same as `renderTabWidgets` default; KDB2 `awaitWithTimeout` default). Not 12s vis/PDF. Not 30s hydrate envelope. |
| 7 | 150ms delay | **Keep** as post-click margin inside traverse. Canvas wait is **additive** after traverse returns. |
| 8 | Timeout / API miss | **Non-fatal.** `{ ok: true, canvasReady: false, clicked: true }` + `WRITEBACK_TABS_TRAVERSAL_FAILED`. Do **not** set `degraded: true` (would flip SET outcome). Do **not** use `TARGET_MISSING` (aborts SET). |
| 9 | writebackSet | **Still consumes only `ok`.** Does not read `canvasReady`. |
| 10 | Skip `hasBeenActivated` | **Unchanged.** `{ canvasReady: true, skippedActivation: true }`, no canvas wait, no `clicked`. |
| 11 | §2.4 page-context poll | **Out.** |

---

## 3. Activate return (click path)

After `tabs/traverse` `waitFor: "canvas"` returns true:

1. `await awaitCanvasReady(_KDB)` (new tabs effect).
2. Re-check stale `runId`. Stale → existing cancelled shape + `clicked: true`.
3. Canvas resolved within cap → `{ ok: true, canvasReady: true, clicked: true }`.
4. Timeout / reject / API missing → `{ ok: true, canvasReady: false, clicked: true, diagnostics: [{ code: WRITEBACK_TABS_TRAVERSAL_FAILED, message }] }`.

Traverse click-fail stays today’s `{ ok: false, canvasReady: false, clicked: true, TARGET_MISSING }`.

`canvasReady: true` on this action now means: click + 150ms **and**
`getCanvasWhenReady` resolved within 2500ms. Skip path is the existing
exception (tab already activated this session).

---

## 4. Files

**New**

- `KDB3/js/dashboard/tabs/effects/awaitCanvasReady.js` — 0 AMD. Local
  `CAP_MS = 2500`, local `withCap` + `swallowLateRejection` (copy the
  `renderTabWidgets.js` pattern; do not lift to `core/utils` or a helpers
  folder). Never throws. Returns `{ ready: boolean }`.

**Change**

- `KDB3/js/dashboard/tabs/actions/parameterSetActivateTab.js` — import the
  effect (5 AMD). Wait only after `traversed === true`. Keep 5a inflight wait
  and 5b `clicked` rules. Extract if the handler would exceed 60 lines.

**Must not change**

- `traverseTabs.js` `waitFor: "canvas"`
- `awaitTabWidgetsRendered.js` / post-restore traverse
- writebackSet (`runFilterRestore`, `runWidgetRestore`, `dispatchOwnerPhase`)
- `waitForTransferReady.js`
- 5a restore/reset wait; 5b abort landing
- `createTabsController.js` AMD list
- item 4 header/icon; T1 history; NMS
- new `_KDB.*`, `.mdc`, `Promise.race`, `errorCodes.js` enum

Line budget: JS ≤150, controller fn ≤60, ≤10 AMD. No `handle*` / `*Support` /
`helpers|shared|common`.

---

## 5. Parent patches (this WP)

- `tabs-parameterSetRestore-contractdelta.md` §5.2: activate `canvasReady`
  is click + 150ms **plus** bounded `getCanvasWhenReady` (this delta).
  Traverse `waitFor: "canvas"` elsewhere stays click + 150ms. writebackSet
  still consumes only `ok`.
- §8: drop “activate still optimistic canvas wait.” Keep deferred: global
  `waitFor: "canvas"` honesty, per-widget activate wait, §2.4 poll.
- `writeback-restore-deferred-backlog.md` §2.1: **in progress T2-5c**;
  full per-widget `whenRenderComplete` on activate still later; do not mark
  done until Cognos.
- `t2-parameterSet-gaps-launch-prompt.md` item 5: 5c in progress; 5a/5b
  stay in progress (not Cognos-green).

`writeback.md` SET sequence: no change (still awaits activate `ok`).

---

## 6. Out of scope

- 5a/5b Cognos-green / backlog-done
- Changing PDF/GET/mutation canvas wait
- `waitFor: "widgetsRendered"` on activate
- writebackSet reading `canvasReady`
- Abort SET on canvas timeout
- §2.4 page-context poll / missingShells re-ensure
- Capping widgetBase `waitForCanvasTransferReady`
- Deduping `cognosAPI.async` vs `cognosAPI.canvas` `getCanvasWhenReady`

---

## 7. Acceptance (Cognos after implement)

1. First activate of a lazy tab during SET: waits until canvas ready or 2.5s,
   then page-context / widget restore continues (`ok: true` even on timeout).
2. Second activate of the same tab in the same run (`hasBeenActivated`): skip,
   no extra canvas wait, no `clicked`.
3. Canvas timeout: SET does **not** abort; diagnostic
   `WRITEBACK_TABS_TRAVERSAL_FAILED`; widgets/filters still attempted.
4. Successful SET still lands on first visible via step 28
   (`waitFor: "widgetsRendered"`).
5. Tab mutation, PDF, GET widget collect: still click + 150ms only.
6. Fail/cancel after a real activate click: 5b abort landing still runs.
7. 5a restore/reset inflight wait unchanged.
