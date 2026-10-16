# Contract Delta: step 24 places restored shells in the tab's page (dropbox), not the tab wrapper

> Delta on `contracts/widgetBase-parameterSetRestore-contractdelta.md` (§76-78), `contracts/widgetBase.md` (take-from-launchpad payload §316-327), `contracts/writeback.md` §6.6 / §6.6.1 row 24, and text drift in `contracts/tabs-writeback-readiness-contractdelta.md` §4.1 (121-122).
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved` (contract only; code pending execution spec) — PO 2026-10-06
**Owner:** `widgetBase` (placement); consumer `writebackSet` (step 24)
**Authoring AI:** Cursor coordinator, 2026-10-06

---

## 1. Problem (live evidence 2026-10-06)

After a parameter-set restore, tab 1 is correct. On tabs 2..n restored vis widgets paint over the kdbControl widget and sit offset / partly outside the canvas.

PO console on tab 2 (shown by user click after restore):

- tab wrapper (`tabId` = `scopeId`) `model00000193df76714b_00000003`; inner page (`pageId`, first child) `model00000193df76714b_00000004`;
- kdbControl host `.KDB3Widget`: parent `…_00000004`, parent width 1800;
- all 4 restored vis shells: parent `…_00000003` (the wrapper), siblings 1..4 after the page, parent width 1844; inline `left/top/width/height` are the saved px values; rendered origin ~12 px left / ~17 px up from the page.

Saved px are page-relative; applied inside the wrapper they shift. Being later siblings of the page (all `z-index: auto`), the shells paint over everything in the page, including kdbControl. One cause, both symptoms.

## 2. Mechanism (verified in code)

- Step 24 passes only `target.tabId` (`handleParameterSetRestore.js:42` → `placeSerializedWidgetEntry.js:37-48`); `pageId` from `tabTargets` is unused.
- `handleTakeFromLaunchpad.js:20`: `dropboxId = payload.dropboxId || payload.tabId` → the wrapper id.
- `placeWidgetOnCanvas.js:34-42` (`resolveDropboxEl`): `getElementById(wrapper)`; not marked `kdb_dropbox` → `querySelector("[kdb_dropbox='true']") || el` → falls back silently to the **wrapper**. `_KDB.elements.dropboxById` is not implemented.
- `kdb_dropbox="true"` is stamped by dragDrop `bindDropboxes.js:35` on `.page.pagegenericPage` present at bind time; rebind on `tabs:changed` is suppressed during traverse/startup/tabMutation (`subscribeTabsChangedRebind.js:85-87`), and step 23 skips the click (no `tabs:changed`) when the inner frame exists. Tab 1's page is stamped at startup → the descendant query finds it; tabs 2..n are unstamped → wrapper.
- User drop appends to the stamped page (`publishValidatedDrop.js:59-60`, `handleDropCreate.js:40`). kdbControl follow uses `getElementById(pageId)` (`followActiveTab.js:50-58`). Legacy restore appended to the page id (`laatsteOriginal/.../wbParameterSetWidgetsHelpers.js:133-134`).
- Nothing later re-parents shells (step 27 / step 28 / `tabs:changed` only render, rebind and move the kdbControl host). Cognos layout write is `left/top/width/height` only.

## 3. Classification

- **(b) Contract gap.** The restore delta (`widgetBase-parameterSetRestore-contractdelta.md:76-78`) and take-from-launchpad (`widgetBase.md:316-327`) name only `tabId` as target; `tabs-writeback-readiness-contractdelta.md:121-122` calls `pageId` / `scopeId` aliases of `tabId`, which makes the wrapper look legal. The dropbox = `pageId` rule exists only in other owners' contracts (`kdbControl-tabFollow-contractdelta.md:28,38`, `tabs-tabCrud-contractdelta.md:39`, `tabs-writeback-readiness-contractdelta.md:125,141` — "WritebackSet must therefore not assume that the tab button DOM itself is the widget target").
- **(a) Code beyond contract:** the silent `|| el` fallback in `resolveDropboxEl` places a shell in a non-dropbox element without any failure or diagnostic (`error-handling.mdc`: no silent conversion of a failure into success).

## 4. Design (PO decisions 2026-10-06: D1 central, D2 warn, D3 retest)

1. **Take target rule (`widgetBase/takeFromLaunchpad`, all callers):** `payload.dropboxId` wins when present. Otherwise the target is the **page** of `payload.tabId`: the `pageId` of the `tabs` read projection entry (`_KDB.api.tabs.getState().tabTargets`) whose `tabId` equals `payload.tabId`, when that `pageId` is a non-empty string different from `tabId`. `payload.tabId` that already is some target's `pageId` is used as is. `tabId` stays the tab identity for widget state (`PLACE_ON_CANVAS_SUCCEEDED`), routing and GET; only the DOM parent changes.
2. **D2 no silent wrapper:** when no distinct page can be resolved (no target, `pageId === tabId`, or tabs state unreadable), placement keeps today's behaviour (`tabId` as dropbox id) **and** logs `console.warn("[widgetBase.takeFromLaunchpad] no distinct page for tab; placing in tab container", { widgetId, tabId })`. No hard failure (fresh tab slots during tab mutation may lack a page child).
3. Step 24 / `placeSerializedWidgetEntry.js` unchanged (150-line file; the central rule covers it). `placeWidgetOnCanvas.js` / `resolveDropboxEl` unchanged.
4. **D3:** no z-index change now. After live retest, if a selected widget still covers kdbControl, a separate delta on the host stacking (`widgetBase.md:426` vs. "kdbControl on top").
5. Text sync at `Implemented`: `widgetBase.md:316-327` (take payload: optional `dropboxId`, page rule); `widgetBase-parameterSetRestore-contractdelta.md:76-78`; `writeback.md` §6.6.1 row 24; P6 list (§6); retire the alias sentences in `tabs-writeback-readiness-contractdelta.md` §4.1 (`tabId` = `scopeId` = layout container; `pageId` = first child = dropbox).

No step reorder, no new facet / Cognos op, no new state field, no event, no new import.

### 4A Amendment A1 — DOM guard on the resolved page (PO 2026-10-06)

Live (K.4/K.5): the rule in §4 item 1 takes `pageId` from state without checking the DOM. During a tab mutation a slot's page may be unmounted (`getElementById(pageId)` null → `WIDGET_BASE_DROP_FAILED` → saga rollback), where the old code fell back to the wrapper. Amended rule:

1. The resolved `pageId` (§4 item 1) is used only when `document.getElementById(pageId)` exists **and** is contained in `document.getElementById(tabId)` (the tab wrapper). Rule "`payload.tabId` already is a `pageId`" is unchanged.
2. Otherwise placement uses `tabId` (wrapper, today's behaviour) and logs `console.warn("[widgetBase.placeWidgetOnCanvas] page not mounted in tab; placing in tab container", { widgetId, tabId, pageId })` (prefix of the view that logs it, item 4). No hard failure (D2 applies).
3. The D2 warning of §4 item 2 stays for "no distinct page". `payload.dropboxId` still wins.
4. **Layering (D-P1, PO 2026-10-06):** the DOM check lives in the view, not in `actions/` (`feature-structure.mdc`, `dom.mdc`). The take passes the state-resolved page as `dropboxId` plus `fallbackDropboxId: tabId` to `placeWidgetOnCanvas`; `resolveDropboxEl` uses `dropboxId` only when that element exists and the `fallbackDropboxId` element exists and contains it, otherwise resolves `fallbackDropboxId` with today's rule and logs the warn of item 2. Without `fallbackDropboxId` the view behaves as today (canvas-drop replay, user drop). Null-guard both lookups. No new import.

Classification: (a) — the shipped code dropped the old wrapper fallback that D2 meant to keep.

## 5. Decisions (PO vastenburg, 2026-10-06)

- **D1 Scope:** central in `handleTakeFromLaunchpad` for every caller that still takes (step 24, launchpad-transfer replay, and any remaining same-slot take). Tab duplicate, delete, move, and their undo/redo no longer take a shell onto another tab; they rebuild on that slot's own stock (`tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1, live 2026-10-07).
- **D2 Fallback:** keep behaviour when no distinct page exists, plus a `console.warn` diagnostic; no hard failure.
- **D3 Stacking:** retest first; host z-index only via a later delta if still needed.

## 6. Pre-check results (read-only, 2026-10-06)

- **P1 Callers.** tabId-only takes (wrapper when the page is unstamped): step 24 (`placeSerializedWidgetEntry.js:37-48`); tab-mutation duplicate/shift used by delete, move, restoreDeleted (`applyTabMutationDuplicate.js:37`, `:107-111`; `handleApplyTabMutation.js:51`; `applyTabMutationRestoreDeleted.js:33`); tab-mutation rollback (`handleRestoreTabMutationSnapshot.js:47`); launchpad-transfer history replay (`applyWidgetBaseLaunchpadTransferHistoryReplay.js:67-75`). Page-correct: user drop (`handleDropCreate.js:40`, does not use take), canvas-drop redo (`applyWidgetBaseCanvasDropHistoryReplay.js:47-52`, passes `dropboxId`). Share inbound = `writebackSet.restore` = step 24. → a step-24-only fix leaves the tab-mutation / rollback / replay paths on the same fallback.
- **P2 `pageId === tabId`.** Possible: `flattenTabDescriptor.js:12`, `createCognosTabsAdapter.js:78`, `syncTabsStateFromDom.js:59` set `pageId = childId || tabId`; `hasTabInnerFrame.js:81-82` treats it as "no distinct page child". Then `getElementById(pageId)` is the wrapper. Inferred: only a not-yet-materialized slot; a tab holding widgets has distinct ids (live case).
- **P3 Readers of the DOM parent.** No dependency on the wrapper: GET uses `frame.tabId` + state layout (`collectWidgets.js:37,46-47`); lazy routing uses `getElementById(tabId).contains(shell)` (`buildCanvasWidgetDescriptor.js:118-127`), page is inside the wrapper; `resolveWidgetShell`, maximize, selection id/class based. Moving into the page **fixes**: move/resize clamp box (`clampShellToDropbox.js:102-103` uses `parentElement`), PDF capture root (`resolveCaptureRoot.js:50-52`, `captureTabPage.js:80`), colour `none` page read (`resolveEffectiveColour.js:50-51`).
- **P4 Unstamped page.** Move/resize do not read `kdb_dropbox`; new drops do (`validateDropIntent.js:9`). Step 28's landing `tabs:changed` rebinds every mounted `.page.pagegenericPage` (`subscribeTabsChangedRebind.js:34`, `bindDropboxes.js:35`); a later user tab click does the same. No change needed.
- **P5 Predicate.** "Must carry or contain `kdb_dropbox`" would reject the still-unstamped page at step 24. With every caller passing the page id, the existing `|| el` returns the page itself; the wrapper is reached only via a wrapper id or `pageId === tabId`. File budget: `placeWidgetOnCanvas.js` 113 lines / 2 imports; `handleTakeFromLaunchpad.js` 51 / 7 imports; `placeSerializedWidgetEntry.js` 150 / 7 (no room).
- **P6 Extra text sync.** `tabs-tabCrud-contractdelta.md:91`; `widgetBase-tabMutation-contractdelta.md:52`; `tabs-history-delete-contractdelta.md:259`; `tabs-writeback-readiness-contractdelta.md:120,127` (with 121-122); `tabs-parameterSetRestore-contractdelta.md:104`; `tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md:103` (drift note goes stale once §4.1 is fixed).

## 7. Out of scope

Colour bugs; singleSelect degraded bookkeeping; step 27/28 behaviour; dragDrop rebind suppression during traverse (unless P4 shows it matters).

## 8. Acceptance (draft)

1. Same restore, then click each visible tab: every restored shell's parent is that tab's `pageId`; positions as on tab 1; kdbControl not covered (D3 retest).
2. Tab 1 unchanged; user drop unchanged; restore phase list unchanged.
3. Tab duplicate / move on a tab with widgets: shells land in the target tab's page.
4. No `[widgetBase.takeFromLaunchpad] no distinct page` warning for normal tabs; if it appears, the warning names the tab.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | — | Live console evidence (shells under tab wrapper) + two read-only investigations (code trace, contracts). |
| 2026-10-06 | `Draft` → `Approved` | PO vastenburg | Pre-check P1–P6 done; D1 central in take, D2 warn (no hard fail), D3 retest first. |
| 2026-10-06 | `Approved` (amended A1) | PO vastenburg | Live: restore K.1–K.3 green; tab duplicate/move showed endless spinner (root cause: tab-page overlay race, see `loadingService-deferredRemoval-ownership-contractdelta.md`, not WP-P). PO chose to keep WP-P with DOM guard §4A (A1). Cognos model parent never updated on cross-slot moves → `futureTodo/widgetBase-cognosModelParent-futuretodo-2026-10-06.md`. |
| 2026-10-06 | `Approved` (A1 item 4) | PO vastenburg | Pre-check: DOM read not allowed in `actions/`; D-P1 → guard in view `placeWidgetOnCanvas` via `fallbackDropboxId`. |
