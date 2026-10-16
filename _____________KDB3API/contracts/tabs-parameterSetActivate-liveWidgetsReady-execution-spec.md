# Execution Spec: tabs activate waits for live widgets (WP-J)

> Mechanical spec for Grok 4.7. Architecture lives in `tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md` (**Approved**, PO vastenburg 2026-10-06). Do **not** re-decide budget, timeout behaviour, scope, code name, placement or abort pattern.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo every row in Section A **before** producing files.

---

**Status:** `Ready for execution` pending PO go — review 2026-10-06: 6 NITs patched (`__controller` entry, try/catch in `finishActivateOk`, `finally` controller release, `notReady: []` early shape, no bare aborted return, acceptance visibility)
**Module / contract:** `contracts/tabs.md` + `contracts/tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** grok 4.7 (W1)
**Reviewer:** coordinator + grok 4.7 review + PO Cognos

---

## Exclusive allowlist (one writer)

**May create:**

- `KDB3/js/dashboard/tabs/effects/readCanvasFacet.js`
- `KDB3/js/dashboard/tabs/effects/waitForTabLiveWidgetsReady.js`

**May edit:**

- `KDB3/js/dashboard/tabs/actions/parameterSetActivateTab.js`
- `KDB3/js/dashboard/tabs/config/parameterSetCodes.js`

**Must not edit:** everything else. Including `__orchestratorTabs.js` (120 lines, cap), `waitForTabInnerFrame.js`, `hasTabInnerFrame.js`, `guardParameterSetRun.js`, `cleanupTabsRuntime.js`, any `core/services/cognosHost/**`, any `core/services/writeback/**`, any `widgetBase/**`, any contract (coordinator writes parent one-liners after Cognos green).

### Global must-not

`.cursor/rules/*.mdc`, `contracts/_archive/**`, git commit/push, folders `helpers` / `common` / `shared`, ES modules, `_KDB.cognosAPI` / `__getDashboardAPI`, new cognosHost facet/op, `_KDB.services.cognosHost` lookups in deep files, new `_KDB.state.tabs` fields, new events, `MutationObserver`, `getCanvasWhenReady` / `whenCanvasReady`, `whenRenderComplete`, `renderWidget`, retries, swallowing host errors, setting `result.degraded`.

---

## Section A. Pre-flight read list

Echo **one sentence** per row before producing files. Wrong/missing echo → stop.

1. `.cursor/rules/kdb-object.mdc` — `_KDB` via argument; no `window._KDB`.
2. `.cursor/rules/state.mdc` — no `_KDB.state` writes in this WP.
3. `.cursor/rules/runtime.mdc` — only `_KDB.runtime.tabs.abortControllers[...]` is written; read the existing `canvasFacet` stamp.
4. `.cursor/rules/module-public-api.mdc` — tabs reads its own runtime stamp; no foreign feature internals.
5. `.cursor/rules/events.mdc` — no events.
6. `.cursor/rules/feature-structure.mdc` — JS ≤150; effects in `effects/`; AMD >6 smell, >10 split.
7. `.cursor/rules/naming.mdc` — `verb+noun.js`; `_` prefix on AMD bindings/params.
8. `.cursor/rules/error-handling.mdc` — try/catch on every exported/named function; no silent catch; `[tabs.<function>]` log prefix.
9. `.cursor/rules/dom.mdc` — no DOM in this WP.
10. `.cursor/rules/amd.mdc` — one `define`; named functions at factory scope; no nested functions; `.bind` for callbacks.
11. `.cursor/rules/cognos-adapter.mdc` — host only via the stamped canvas facet.
12. `.cursor/lifecycleVocabulary.md` — no new lifecycle terms.
13. `contracts/tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md` — §2, §3, §4, §7.
14. `contracts/cognosHostService.md` — canvas facet `listCanvasWidgets` (sync Outcome, `data` = descriptor array with `widgetId`, `tabId`, `isLiveWidget`) and `whenWidgetReady(widgetId, { signal, budgetMs })` Outcomes.
15. This execution spec.

---

## Section B. Folder tree

```
KDB3/js/dashboard/tabs/
  config/parameterSetCodes.js                 (edit)
  effects/readCanvasFacet.js                  (create)
  effects/waitForTabLiveWidgetsReady.js       (create)
  actions/parameterSetActivateTab.js          (edit)
```

No new folders.

---

## Section C. Per-file specifications

#### `config/parameterSetCodes.js`

- Add one entry after `RENAME_FAILED`: `LIVE_WIDGETS_READY_TIMEOUT: "TABS_LIVE_WIDGETS_READY_TIMEOUT"`.
- Header comment unchanged (already states `TABS_*` are owner-level, not writeback enum).
- **Rules to apply:** `naming.mdc`, `amd.mdc`.

#### `effects/readCanvasFacet.js` (create)

- Same shape as `dashboard/widgets/widgetBase/effects/readCanvasFacet.js`, reading `_KDB.runtime.tabs.canvasFacet` (stamped by `__orchestratorTabs.js:80`).
- `define([], ...)`, `"use strict";`, `function __controller(_KDB)` returns the facet or `null`. Comment: stamp is injected by `__orchestratorTabs`; deep files do not look up `_KDB.services.cognosHost`.
- Lines ≈ 12.
- **Rules to apply:** `runtime.mdc`, `cognos-adapter.mdc`, `amd.mdc`, `naming.mdc`.

#### `effects/waitForTabLiveWidgetsReady.js` (create)

- **AMD imports (2):** `"./readCanvasFacet.js"`, `"../config/parameterSetCodes.js"`.
- **Factory constants:** `var BUDGET_MS = 5000;` (comment: delta §7 Q1, maximum — resolves as soon as all waits settle). `var KEY_PREFIX = "tabLiveWidgetsReady:";`
- **Entry:** the file returns `async function __controller(_KDB, _tabId)` (new-file convention, as `traverseTabs.js` / `applyTabsEffects.js`). The action's AMD binding stays `_waitForTabLiveWidgetsReady`; log prefix stays `[tabs.waitForTabLiveWidgetsReady]`. Always resolves (never throws) to
  `{ liveWidgets: { count, ready, notReady: string[] }, diagnostics: [] }`.
- **Early-return shape** (steps 1, 2 and `catch`): exactly `{ liveWidgets: { count: 0, ready: 0, notReady: [] }, diagnostics: [one] }` — `notReady` is always an array, never `null`. Messages: `"canvas facet unavailable"`, `"canvas widget list failed"`, or `err.message`. Code stays `TABS_LIVE_WIDGETS_READY_TIMEOUT`.
- **Body (try / catch / finally):**
  1. `facet = _readCanvasFacet(_KDB)`. If `!facet` or `listCanvasWidgets` / `whenWidgetReady` not functions → `console.warn("[tabs.waitForTabLiveWidgetsReady] canvas facet unavailable", _tabId)`; early-return shape with diagnostic `details: { widgetId: null, tabId: _tabId, facetCode: "CANVAS_FACET_UNAVAILABLE" }`.
  2. `list = facet.listCanvasWidgets()` (sync, no `waitUntilReady`). If `!list || list.ok !== true || !Array.isArray(list.data)` → `console.warn` with `_tabId` and `list && list.errorCode`; early-return shape with `details: { widgetId: null, tabId: _tabId, facetCode: (list && list.errorCode) || null }`.
  3. `ids` = `widgetId` of descriptors with `isLiveWidget === true` and `String(d.tabId) === String(_tabId)`. Use a factory-scope filter function, not an inline closure.
  4. `ids.length === 0` → return `{ liveWidgets: { count: 0, ready: 0, notReady: [] }, diagnostics: [] }`.
  5. Controller: key `KEY_PREFIX + String(_tabId)` on `_KDB.runtime.tabs.abortControllers` (ensure object exists); first abort a previous controller under that key, then store a new `AbortController`.
  6. `outcomes = await Promise.all(ids.map(armWidgetWait.bind(null, facet, controller.signal)))`. `armWidgetWait(_facet, _signal, _widgetId)` (factory scope) returns `Promise.resolve(_facet.whenWidgetReady(_widgetId, { signal: _signal, budgetMs: BUDGET_MS })).catch(onWaitRejected.bind(null, _widgetId))`. `onWaitRejected` logs `console.error("[tabs.waitForTabLiveWidgetsReady] wait rejected", widgetId, err)` and returns `{ ok: false, outcome: "failed", errorCode: "CANVAS_WAIT_FAILED" }`.
     **Do not** add a bare `if (signal.aborted) return;` after this await: it would return `undefined` and break the action. Aborted Outcomes are classified in step 8; cancellation stays the action's `isStale` check.
  7. Controller release lives in `finally` (covers the catch path too): if `abortControllers[key] === controller` → `controller.abort()` and `delete abortControllers[key]`. A newer wait's controller, or destroy's replaced map, is left alone.
  8. Classify per index: `ok === true` → `ready += 1`. `outcome === "aborted"` → neither ready nor notReady, no diagnostic. Else → push id to `notReady` and a diagnostic
     `{ code: _codes.LIVE_WIDGETS_READY_TIMEOUT, message: "live widget not ready within budget", details: { widgetId, tabId: _tabId, facetCode: outcome.errorCode || null } }`.
  9. If `notReady.length > 0` → one `console.warn("[tabs.waitForTabLiveWidgetsReady] live widgets not ready", _tabId, notReady)`.
  10. Return the shape with `count: ids.length`.
  - `catch (err)`: `console.error("[tabs.waitForTabLiveWidgetsReady] failed", _tabId, err)`; early-return shape with `details: { widgetId: null, tabId: _tabId, facetCode: null }`, message from `err.message`.
- Lines target 90–120 (hard 150). All helpers at factory scope, each with try/catch per `error-handling.mdc` where they can throw.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`, `runtime.mdc`, `cognos-adapter.mdc`, `naming.mdc`, `feature-structure.mdc`.

#### `actions/parameterSetActivateTab.js` (edit)

- Live 118 lines, AMD 6 → after edit AMD **7**, lines **≤ 140** (hard 150; if exceeded: stop and report).
- Add import `"../effects/waitForTabLiveWidgetsReady.js"` as last entry, binding `_waitForTabLiveWidgetsReady`.
- Header comment: append one line referencing `tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md` (success additionally waits for the tab's live widgets, max 5000 ms, never aborts on not-ready).
- New factory-scope function:

```js
async function finishActivateOk(_ctx, payload, tabIdx, slot, extra) {
  try {
    const live = await _waitForTabLiveWidgetsReady(_ctx._KDB, slot.tabId);
    if (_guard.isStale(_ctx._KDB, payload.runId)) {
      return Object.assign(withActivateShape(_guard.cancelledResult(), tabIdx), extra);
    }
    return Object.assign({
      ok: true, tabIdx: tabIdx, canvasReady: true,
      diagnostics: live.diagnostics, liveWidgets: live.liveWidgets
    }, extra);
  } catch (err) {
    console.error("[tabs.finishActivateOk] failed", tabIdx, err);
    return Object.assign({
      ok: false, tabIdx: tabIdx, canvasReady: false,
      diagnostics: [{ code: _codes.TARGET_MISSING, message: String(err && err.message ? err.message : err) }]
    }, extra);
  }
}
```

- Replace the three success returns, nothing else:
  - line ~46 → `return finishActivateOk(_ctx, payload, tabIdx, slot, { skippedActivation: true });`
  - line ~54 → same as ~46.
  - line ~100 (inside the existing try) → `return finishActivateOk(_ctx, payload, tabIdx, slot, { clicked: true });`
- Guard, missing-slot, stale, traverse-fail and frame-timeout returns are unchanged. The only new try/catch is in `finishActivateOk`.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`, `feature-structure.mdc`, `naming.mdc`, `state.mdc` (no state writes).

---

## Section D–I

No reducer, selector, public API, event or harness change.

---

## Section J. Acceptance (self-verification)

1. Four files per Section B; nothing else touched.
2. `parameterSetActivateTab.js` ≤ 150 lines, AMD 7; effect ≤ 150, AMD 2; reader AMD 0.
3. Success result on all three ok paths carries `liveWidgets` and the effect's `diagnostics`; existing fields (`skippedActivation`, `clicked`, `canvasReady`) preserved.
4. No `result.degraded`, no `ok: false` from not-ready widgets.
5. `budgetMs: 5000` passed on every `whenWidgetReady` call; calls run in parallel.
6. No nested functions; no `_KDB.services.cognosHost` lookup; no `_KDB.cognosAPI`.
7. Report: paths, line counts, AMD counts, Section A echoes, deviations.

## Section K. Live acceptance (PO, after review)

Per delta §9: fresh load, restore `oude parameterset.txt`, **no console observer**, Cognos breakpoint `this.visualization && !this.visAPI && e && e.isInScope(this.getScope())` armed. Expected: breakpoint not hit; `nativeMultiSelectRestore` `ok: true`; no `TABS_LIVE_WIDGETS_READY_TIMEOUT` in the `tabActivateForPageContext` / `tabActivateForWidgets` phase diagnostics (or, if present, listed with widget ids for analysis). `liveWidgets` is **not** stored in `run.phases` (`createRunContext.js` `recordPhase`); `liveWidgets.count` is only visible on the action's return value (`result` in `dispatchOwnerPhase`), checked only if the breakpoint is hit again. (Step 27 may still abort on the TopN helper; separate delta `writeback-step27-bindPerActiveTab-contractdelta.md`.)

## Section L. Forbidden

Modify `.mdc` or contracts; read legacy trees as source; commit/push; invent behaviour (stop and report); skip Section A echoes; edit `__orchestratorTabs.js`.
