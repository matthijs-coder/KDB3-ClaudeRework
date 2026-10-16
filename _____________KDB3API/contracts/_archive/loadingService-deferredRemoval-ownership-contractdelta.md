# Contract Delta: loadingService deferred removal acts only on what it finished

**Parent:** `contracts/loadingService.md` (§ runtime, `finishLoading`)
**Related:** `loadingService-overlay-coverage-contractdelta.md` (tab-page overlay `kdb-tab-page-loading`), `tabs-tabCrud-contractdelta.md`
**Work package:** WP-Q
**Status:** `Approved` (contract only; code pending execution spec) — PO 2026-10-06

---

## 1. Problem (live evidence 2026-10-06)

After a tab duplicate / move, widgets look like they load forever. Removing the spinner by hand shows the widget is rendered. Console check: exactly one visible `.loadingIndicatorContainer loadingIndicatorSolid` with a KDB caption, not inside any Cognos widget. Caption on screen: **"Registerkarte wird geladen"** = tab-page overlay (`tabs/effects/applyTabPageLoading.js`, mountKey `kdb-tab-page-loading`). Also seen with the pre-WP-P `handleTakeFromLaunchpad.js` → pre-existing.

## 2. Mechanism (verified in code)

1. `applyTabPageLoading.start` always calls `finish()` and then `startLoading` with the **same** mountKey, possibly on a **different** page (`applyTabPageLoading.js:11-20`). A tab mutation runs several `tabsMutation` traverses back to back (ensure slots, reveal, landing), each one a start.
2. `finishLoading` at `activeCount` 0 schedules removal with `setTimeout(removeDelayMs = 0)` (`removeLoadingOverlay.js:28-29`, `scheduleOverlayRemoval.js:18`).
3. The next `startLoading` runs before that timeout and overwrites `domRefs.mountsByMountKey[key]` / `spinnersByMountKey[key]` with the new page and spinner (`applyLoadingOverlay.js:34,95`). It does not cancel the pending removal.
4. When the timeout fires, `removeOverlayNow` reads the **live** `spinnersByMountKey[key]` (`scheduleOverlayRemoval.js:51`): it removes the **new** spinner, strips `KDB_loading` from the **old** mount, then deletes all refs for the key. The **old** spinner stays on the old page (orphan); the new overlay has lost its refs, so its later finish cannot find it.

## 3. Classification

**(b) contract gap.** `loadingService.md:32,103` says finish "schedules spinner removal and position restoration" but does not say what the deferred removal owns when the same mountKey is started again before it runs. The code reads live refs, which breaks for any same-key restart (tab-page overlay in practice).

## 4. Design (PO 2026-10-06: fix the race in loadingService; callers unchanged)

1. **Snapshot on finish.** When `finishLoading` reaches `activeCount` 0 it captures, for that mountKey, the mount element, the spinner element and the position override **at that moment**. The deferred removal acts only on that snapshot.
2. **Ownership on removal.** The deferred removal removes the captured spinner (if still attached), removes `KDB_loading` from the captured mount and restores its position. It deletes the per-key runtime refs only when they still point to the captured mount / spinner.
3. **Restart before removal.** `startLoading` for a mountKey with a pending removal reconciles it **before** writing any live ref for that key:
   - same mount element (`snapshot.mountEl === new mountEl`): cancel the pending timer and drop the snapshot only. Do **not** strip `KDB_loading`, restore position, or delete live refs (otherwise `ensureMountPositioning` would capture `relative` as the original). The existing spinner is reused;
   - different mount element: run the pending removal for the snapshot **synchronously** (rules 1–2), then start on the new mount.
   The start re-arms its watchdog as today; finish already cleared the old one.
4. **Snapshot storage:** `_KDB.runtime.loadingService.domRefs.pendingRemovalByMountKey[mountKey] = { mountEl, spinnerEl, originalPosition, hadPositionOverride }`; timer stays in `timers.removeDelaysByMountKey`. `destroy()` first flushes all pending snapshots, then live refs (public behaviour unchanged).
5. **Keyed finish never falls back to the kdbControl root** (pre-check P4, if PO approves D-Q2): `finishLoading({ mountKey })` / `({ handle })` with no live mount for that key decrements `activeCount` and does nothing in the DOM. Today it falls back to `_KDB.elements.kdbWidget` and can remove a foreign spinner inside kdbControl, and returns before the decrement.
6. **Unchanged:** public API (`startLoading` / `finishLoading` / `updateLoadingMessage` / `destroy`), handle shape, `activeCount` semantics, watchdog (incl. boot home dialog), `removeDelayMs` default 0, `destroy()`, all callers (`applyTabPageLoading.js`, traverse, observe, saga). No new event, no new state field in `_KDB.state.loading`; runtime may hold the snapshot per mountKey (`_KDB.runtime.loadingService`, cleared by `destroy`).

## 5. Decisions (PO vastenburg, 2026-10-06)

- **Fix:** race in loadingService only. Not chosen now: skip the tab-page overlay for `source: "tabsMutation"`; saga-wide finish safety net.
- **D-Q2:** rule 5 in scope (keyed finish: no kdbControl fallback, always decrement).
- **D-Q3:** P3 (restart while active on another mount) → futureTodo note only.

## 6. Pre-check results (read-only, 2026-10-06)

§2 steps 1–4 confirmed in code (`applyTabPageLoading.js:13-19`, `removeLoadingOverlay.js:24-29`, `scheduleOverlayRemoval.js:18,51-67`, `applyLoadingOverlay.js:34,88,95`); the timeout also restores the live position override onto the old mount.

- **P1** Finish-then-start on one key: tab page; save/load slot (`applySaveLoadSlotLoading.js:21-29`). Vis render key per widget can change mount without finish. Boot, SET, GET, PDF, tree: one stable mount.
- **P2** No production caller passes `removeDelayMs > 0` → rule 3 changes no visible timing.
- **P3** Start while active on another mount orphans the previous spinner too (vis re-apply can hit it). Not this bug.
- **P4** Keyed finish with refs gone falls back to `kdbWidget` (`removeLoadingOverlay.js:42-47`) and can remove a foreign spinner inside kdbControl; a missing mount returns before the decrement (`:16-18`). Rule 2 does not fix it → rule 5.
- **P5** Budgets: `applyLoadingOverlay.js` 100 lines / 7 imports (no room for imports); `createLoadingService.js` 90 / 6; `scheduleOverlayRemoval.js` 72 / 2; `removeLoadingOverlay.js` 75 / 3; `clearLoadingRuntime.js` 61 / 1. Plan: new `effects/applyOverlayRemovalSnapshot.js`, new `effects/reconcilePendingOverlayRemoval.js` called from `createLoadingService.startLoading` before apply.
- **P6** Text sync at `Implemented`: `loadingService.md:31-32`, `:96-103`, `:194-209`; `loadingService-overlay-coverage-cognos-followup-contractdelta.md:67-76`.

## 7. Out of scope

Cognos model parent on cross-slot moves (futureTodo); WP-P DOM guard (separate amendment A1); colour bugs; singleSelect degraded.

## 8. Acceptance (draft)

1. Tab duplicate and tab move (and their undo/redo) on tabs with widgets: after the mutation settles, `document.querySelectorAll(".loadingIndicatorContainer")` has no visible element; no "Registerkarte wird geladen" left.
2. Normal user tab clicks, incl. fast clicking across tabs: overlay shows and disappears; no orphan.
3. Boot, SET restore, GET persist, PDF export, widget render ("Diagramm wird geladen"), kdbControl tree / slot overlays: unchanged.
4. No new console errors.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | PO vastenburg | Live evidence (orphan tab-page overlay) + read-only investigations; PO chose "fix the race" only. |
| 2026-10-06 | `Draft` → `Approved` | PO vastenburg | Pre-check P1–P6 done; design holes closed (reconcile before live writes, same-mount cancel only, destroy flushes snapshots); D-Q2 fix, D-Q3 note. |
