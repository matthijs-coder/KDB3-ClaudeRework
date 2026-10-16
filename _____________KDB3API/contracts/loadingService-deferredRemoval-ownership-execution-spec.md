# Execution Spec: loadingService deferred removal acts only on what it finished (WP-Q)

> Mechanical spec for Grok 4.6. Architecture lives in `loadingService-deferredRemoval-ownership-contractdelta.md` (**Approved**, PO vastenburg 2026-10-06). Do **not** re-decide: race fix in loadingService only, callers unchanged, D-Q2 (rule 5 in scope), D-Q3 (P3 not in scope).
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo Section A before editing.

---

**Status:** `Executed` — review PASS-WITH-NITS 2026-10-06; Section K live pending
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** grok 4.6 (W1)
**Reviewer:** coordinator + grok 4.6 review + PO Cognos

---

## Exclusive allowlist

All paths under `KDB3/js/core/services/loadingService/`.

**May create:**

- `effects/applyOverlayRemovalSnapshot.js`
- `effects/reconcilePendingOverlayRemoval.js`

**May edit:**

- `effects/scheduleOverlayRemoval.js`
- `effects/removeLoadingOverlay.js`
- `runtime/ensureLoadingRuntime.js`
- `runtime/clearLoadingRuntime.js`
- `createLoadingService.js`

**Must not edit:** everything else — incl. `effects/applyLoadingOverlay.js`, `effects/updateLoadingMessage.js`, `effects/scheduleLoadingWatchdog.js`, `state/**`, `__orchestratorLoadingService.js`, every caller (`tabs/**`, `kdbControl/**`, `widgetSettings/**`, writeback, PDF), CSS, contracts, `.mdc`. No commit/push.

## Section A. Pre-flight read list

Echo one sentence per row before editing.

1. `.cursor/rules/kdb-object.mdc`
2. `.cursor/rules/state.mdc` — no change to `_KDB.state.loading`; `markLoadingStarted` / `markLoadingFinished` stay the only writers.
3. `.cursor/rules/runtime.mdc` — owner `loadingService`; new key `domRefs.pendingRemovalByMountKey` lives in the existing `_KDB.runtime.loadingService.domRefs` bucket and is cleared by `destroy`.
4. `.cursor/rules/module-public-api.mdc` — public API unchanged.
5. `.cursor/rules/events.mdc` — no events.
6. `.cursor/rules/feature-structure.mdc` — ≤150 lines per file.
7. `.cursor/rules/naming.mdc`
8. `.cursor/rules/error-handling.mdc` — non-boundaries log and rethrow; `createLoadingService` public methods are the boundary (existing try/catch).
9. `.cursor/rules/amd.mdc` — one define, `__controller`, named factory-scope helpers, no nested functions.
10. `.cursor/rules/dom.mdc` — DOM only on the mount / spinner elements already owned by the service.
11. `contracts/loadingService.md` §§ runtime (lines ~31-34, 90-104).
12. `contracts/loadingService-deferredRemoval-ownership-contractdelta.md` §2, §4, §5, §6.
13. Live files (read fully): `createLoadingService.js` (90 lines, 6 imports), `effects/applyLoadingOverlay.js` (100 / 7, read only; note `resolveMountElement` / `resolveMountKey` at lines 49-64 and `ensureMountPositioning` 66-72), `effects/removeLoadingOverlay.js` (75 / 3), `effects/scheduleOverlayRemoval.js` (72 / 2), `runtime/ensureLoadingRuntime.js` (20 / 0), `runtime/clearLoadingRuntime.js` (61 / 1), `state/markLoadingFinished.js`, `tabs/effects/applyTabPageLoading.js` (caller, read only).
14. This spec.

## Section C. Per-file specification

Snapshot shape (one per mountKey): `{ mountEl, spinnerEl, hadPositionOverride, originalPosition }`.

#### `runtime/ensureLoadingRuntime.js` (edit)

- Add `_KDB.runtime.loadingService.domRefs.pendingRemovalByMountKey = _KDB.runtime.loadingService.domRefs.pendingRemovalByMountKey || {};` next to the other `domRefs` maps, using the same full-path style as the existing lines (no new local variable). Nothing else.

#### `effects/applyOverlayRemovalSnapshot.js` (new)

- Imports: `../runtime/ensureLoadingRuntime.js`, `../../../cognosHost/config/rootChromeSelectors.js` (same path as `scheduleOverlayRemoval.js` today). 2 imports.
- `__controller(_KDB, _mountKey)` → `true` when a snapshot was applied, else `false`. Inside `try`:
  1. `runtime = _ensureLoadingRuntime(_KDB)`; `snapshot = runtime.domRefs.pendingRemovalByMountKey[_mountKey]`; none → `return false`.
  2. Clear and delete `runtime.timers.removeDelaysByMountKey[_mountKey]` (`clearTimeout` first).
  3. `spinnerEl = snapshot.spinnerEl || (snapshot.mountEl && snapshot.mountEl.querySelector(spinnerSelector))` — same selector resolution and same fallback as `scheduleOverlayRemoval.js:41-51` today. Remove it when it has a `parentNode`.
  4. `snapshot.mountEl.classList.remove("KDB_loading")` (null-guarded); if `snapshot.hadPositionOverride === true` → `snapshot.mountEl.style.position = snapshot.originalPosition`.
  5. Ownership-guarded live-ref cleanup: if `domRefs.mountsByMountKey[_mountKey] === snapshot.mountEl` → delete `mountsByMountKey[_mountKey]` and `positionOverridesByMountKey[_mountKey]`. If `domRefs.spinnersByMountKey[_mountKey] === snapshot.spinnerEl` (or `spinnersByMountKey[_mountKey] === spinnerEl` from step 3) → delete `spinnersByMountKey[_mountKey]`. Otherwise leave live refs untouched.
  6. Delete `pendingRemovalByMountKey[_mountKey]`; `return true`.
- `catch`: `console.error("[loadingService.applyOverlayRemovalSnapshot] failed", { mountKey: _mountKey }, err); throw err;`
- Factory-scope helpers allowed (e.g. `resolveSpinnerSelector`, `restoreSnapshotMount`); no nested functions.

#### `effects/scheduleOverlayRemoval.js` (edit)

- Imports: `../runtime/ensureLoadingRuntime.js`, `./applyOverlayRemovalSnapshot.js` (drop `rootChromeSelectors` if no longer used). ≤3 imports.
- In `__controller`, before `clearExistingRemoval(runtime, mountKey)`: if a snapshot already exists for `mountKey` and its `mountEl !== mountEl` → `_applyOverlayRemovalSnapshot(_KDB, mountKey)` first (flush the older one). Then `clearExistingRemoval(runtime, mountKey)` as today.
- **Capture the snapshot at schedule time, all fields from the same mount:**
  ```js
  const liveMatches = runtime.domRefs.mountsByMountKey[mountKey] === mountEl;
  runtime.domRefs.pendingRemovalByMountKey[mountKey] = {
    mountEl: mountEl,
    spinnerEl: liveMatches ? (runtime.domRefs.spinnersByMountKey[mountKey] || null) : null,
    hadPositionOverride: liveMatches && Object.prototype.hasOwnProperty.call(runtime.domRefs.positionOverridesByMountKey, mountKey),
    originalPosition: liveMatches ? runtime.domRefs.positionOverridesByMountKey[mountKey] : undefined
  };
  ```
  (`mountEl` is the finish-time mount passed in, as today.) Then schedule `setTimeout(runRemoveOverlayTimeout, delayMs, _KDB, mountKey)` exactly as today (same `delayMs` resolution, default 0).
- `__controller` keeps its current catch (log, **no rethrow**, `:19-21`).
- `runRemoveOverlayTimeout(_KDB, mountKey)` calls `_applyOverlayRemovalSnapshot(_KDB, mountKey)` inside try/catch (`console.error("[loadingService.removeOverlay] failed", error)`; timer callback = boundary, no rethrow — as today).
- Remove `removeOverlayNow` and `resolveSpinnerSelector` (moved). Do not read live `spinnersByMountKey` at timeout time any more.

#### `effects/reconcilePendingOverlayRemoval.js` (new)

- Imports: `../runtime/ensureLoadingRuntime.js`, `./applyOverlayRemovalSnapshot.js`. 2 imports.
- `__controller(_KDB, _options)`: declare `let mountKey;` **before** the `try`. Inside `try`:
  1. Resolve `mountEl` and assign `mountKey` with `resolveMountElement` / `resolveMountKey` copied **byte-identical** from `applyLoadingOverlay.js:49-64` as factory-scope functions (do not import from `applyLoadingOverlay.js`, do not paraphrase).
  2. `snapshot = runtime.domRefs.pendingRemovalByMountKey[mountKey]`; none → return.
  3. **Same mount** (`mountEl && snapshot.mountEl === mountEl`): `clearTimeout` + delete `timers.removeDelaysByMountKey[mountKey]`; delete the snapshot; return. Do **not** remove the spinner, do **not** touch `KDB_loading`, position or live refs.
  4. **Different mount:** `_applyOverlayRemovalSnapshot(_KDB, mountKey)` (synchronous flush).
- `catch`: `console.error("[loadingService.reconcilePendingOverlayRemoval] failed", { mountKey: mountKey }, err); throw err;`

#### `createLoadingService.js` (edit)

- Add import `./effects/reconcilePendingOverlayRemoval.js` (6 → 7).
- In `startLoading`, inside the existing `try`, call `_reconcilePendingOverlayRemoval(_KDB, _options);` **before** `return _applyLoadingOverlay(_KDB, _options);`. Nothing else changes (disposed guard, catch, other methods).

#### `effects/removeLoadingOverlay.js` (edit — rule 5, D-Q2)

- `resolveFinishMountElement`: keep the order of lines 36-48 exactly. Replace **only** `|| ((_KDB.elements && _KDB.elements.kdbWidget) || null)` on the `handle.mountKey` branch (`:43`) and the `mountKey` branch (`:46`) with `|| null`. The `mountEl` / `handle.mountEl` branches and the final no-key default (`kdbWidget`, `:48`) stay.
- `__controller`: replace the early return at `:16-18` with: if `!mountEl` and (`_options && (_options.mountKey || (_options.handle && _options.handle.mountKey))`): `const key = resolveFinishMountKey(null, _options); const entry = _markLoadingFinished(_KDB, key); if (entry.activeCount === 0) { clearWatchdog(runtime, key); } return;` — else (`!mountEl`, no key) `return;` as today. No DOM work, no scheduling in that branch.
- Everything else unchanged.

#### `runtime/clearLoadingRuntime.js` (edit)

- After `clearTimerMap(...)` (`:13-14`) and before the existing spinner/mount loops: for every key in `domRefs.pendingRemovalByMountKey`, `removeSpinner(snapshot.spinnerEl)` and `restoreMount(snapshot.mountEl, snapshot.hadPositionOverride === true ? snapshot.originalPosition : undefined)` (existing helpers). Then the existing code; also reset `runtime.domRefs.pendingRemovalByMountKey = {}` with the other resets.

**Rules to apply (all files):** `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `runtime.mdc`, `state.mdc`, `module-public-api.mdc`, `feature-structure.mdc`, `dom.mdc`. Each file ≤150 lines, ≤7 imports.

## Section J. Acceptance (self-verification)

1. Only allowlisted files created/edited.
2. `applyLoadingOverlay.js`, `state/**`, callers untouched; public API (`startLoading`, `finishLoading`, `updateLoadingMessage`, `destroy`) and handle shape unchanged.
3. Walk-through in the report (by reading the code, no harness), each with file:line:
   a. Tab-page race: start(A) → finish → start(B) same tick → A's spinner removed synchronously by reconcile, B's spinner remains, B's refs intact; later finish removes B's spinner.
   b. Same-mount restart: start(A) → finish → start(A) same tick → timer cancelled, spinner reused, position override not re-captured, `KDB_loading` stays, watchdog re-armed, `activeCount === 1`.
   f. Re-schedule: two finishes before the timeout (same mount) → one snapshot, one removal.
   c. Single start/finish: removal still deferred by `removeDelayMs` (default 0) and removes the right spinner, class and position.
   d. Keyed finish with no live mount: count decremented, no DOM touched, no kdbControl fallback.
   e. `destroy()` with a pending snapshot: snapshot spinner removed, mount restored, maps reset.
4. `node --check` on every touched file.
5. Report: Section A echoes, per file line count + import count, diff summary, deviations, Section J pass/fail.

## Section K. Live acceptance (PO)

Fresh load.

1. Tab duplicate on a tab with widgets, then tab move (left and right), then undo/redo of the move: after each action settles, no "Registerkarte wird geladen" stays; `[...document.querySelectorAll(".loadingIndicatorContainer")].filter(n => n.offsetParent !== null).length === 0`.
2. Normal user tab clicks, incl. fast clicking across 3+ tabs: the tab overlay shows and disappears; no orphan.
3. Unchanged: boot overlay ("Dashboard wird geladen"), SET restore, GET persist, PDF export, widget render ("Diagramm wird geladen"), kdbControl tree / save-load slot overlays.
4. No new console errors or warnings.

## Section L. Forbidden

Editing any other file (esp. `applyLoadingOverlay.js` and callers); changing timing defaults; adding events or state fields; skipping the tab overlay for `tabsMutation`; touching nested Cognos spinners beyond today's fallback query; commit/push; improvising (stop and report).

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | — | Written from Approved delta (race fix, D-Q2 fix, D-Q3 note). |
| 2026-10-06 | `Draft` → `Ready for execution` (pending go) | coordinator | Grok 4.6 spec review PASS-WITH-FIXES; MUST-FIX 1 (snapshot fields from one mount), 2 (rule 5 exact mapping), 3 (reconcile catch scope) + NITs patched. |
| 2026-10-06 | `Ready for execution` → `Executed` (live pending) | PO go; W1 grok 4.6 | 2 new + 5 edited files in `loadingService/`, `node --check` ok, J a–f pass. Independent review PASS-WITH-NITS (extra `classList` guard; `createLoadingService.js` 7 imports). Coordinator read both new files. Committed by PO in `049d740`. |
