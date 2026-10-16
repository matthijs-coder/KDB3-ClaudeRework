# Execution Spec: closed-dock chip overlay (M2)

> Mechanical spec for Grok 4.6. Law: `singleSelect-closed-dock-chip-overlay-contractdelta.md`
> (PO GO 2026-09-09). One writer. Exclusive allowlist. Echo Section A **before** files.
> Do **not** reopen H0, restore-table-display locks, or Dienststelle sanitizer.

---

**Status:** `Executed` — 2026-09-09; dual review PASS. **PO Cognos green 2026-09-09.**  
**Module / contract:** `contracts/singleSelect-closed-dock-chip-overlay-contractdelta.md`  
**Phase:** `extension`  
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09  
**Executing AI:** grok 4.6 army  
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist (one writer)

**May edit:**

- `KDB3/js/dashboard/filters/filterDock/config/ownerRoutes.js`
- `KDB3/js/dashboard/filters/singleSelect/config/actions.js`
- `KDB3/js/dashboard/filters/singleSelect/config/selectors.js`
- `KDB3/js/dashboard/filters/singleSelect/actions/dispatchSingleSelectAction.js`
- `KDB3/js/dashboard/filters/singleSelect/actions/parameterSet/handleParameterSetResync.js`

**May create:**

- `KDB3/js/dashboard/filters/singleSelect/view/applySingleSelectCommittedDisplay.js`
- `KDB3/js/dashboard/filters/singleSelect/effects/handleFilterDockCommittedDisplayObserved.js`

**Must not edit:** `evaluateDockCommittedDisplayResync.js`; `bindDockObserver.js`; `dispatchFilterHandoff.js`; `applyDienststelleDisplaySanitizing.js`; `routeDienststelleDispatch.js`; `applyRestoreSelectionCore.js`; `parameterSetResyncApplyPair.js`; `hydrateStateFromPopup.js`; `restorePopupSelection.js`; SSS `ownerRoutes` keys; `processFilterDockHandoff.js`; GET collectors; `filterPropId.js`; `KDB.js`; contracts; `.mdc`; git.

---

## Section A. Pre-flight

Echo one sentence per row **before** files:

1. `kdb-object.mdc` — `_KDB` via argument.
2. `state.mdc` — read `instancesById`; **no** selection writes.
3. `runtime.mdc` — no new bucket; do not use `runtime.domRefs.filterEl` as the wrapper.
4. `module-public-api.mdc` — known-owner `dispatch` only; no new public method.
5. `events.mdc` — no new fact-event; this is an existing dock action type on a new owner.
6. `feature-structure.mdc` — JS ≤150; AMD ≤10; painter in `view/`; handler in `effects/`; dispatch only routes.
7. `naming.mdc` — `_` on boundary inputs; English files.
8. `error-handling.mdc` — try/catch on handler and view entry; `console.error("[singleSelect.<name>] failed", …)`.
9. `dom.mdc` — selectors from SS `config/selectors.js` (chrome catalog); live query; no `_KDB.cognosAPI`.
10. `amd.mdc` — one `define` per file; factory-scope helpers; no nested functions in entry bodies.
11. `lifecycleVocabulary.md` — no new term.
12. `cognos-adapter.mdc` — no host write.
13. `contracts/singleSelect-closed-dock-chip-overlay-contractdelta.md` — locks 1–9.
14. This spec.

---

## Section B. Edit / create order

1. `filterDock/config/ownerRoutes.js`
2. `singleSelect/config/actions.js`
3. `singleSelect/config/selectors.js`
4. `singleSelect/view/applySingleSelectCommittedDisplay.js` **(create)**
5. `singleSelect/effects/handleFilterDockCommittedDisplayObserved.js` **(create)**
6. `singleSelect/actions/dispatchSingleSelectAction.js`
7. `singleSelect/actions/parameterSet/handleParameterSetResync.js`

---

## Section C. Per-file

### Traps

1. SSS `ownerRoutes` block: **do not add** `needsFilterDockCommittedDisplayResync`.
2. Painter: compare `textContent` trim to caption **before** write. Second childList pass must no-op.
3. `isCommitInProgress === true` → skip that instance.
4. `displaySource !== "table"` or null `displayValue` → skip.
5. Wrapper: `scopeType === "global"` → `#filterDock__global`, else `#filterDock__other`. Query `[data-id="<filterLabel>"]` inside that bucket, `closest` wrapper class.
6. SET-tail: call handler only after **successful** reconcile (`result.ok !== false` path that currently returns `result` at line 63). Do not call on cancelled/failed mergeTerminalCleanup.
7. Handler ignores dock payload fields; signature `(_KDB)` or `(_KDB, _payload)` unused payload. Same function from dispatch and resync.
8. Do not import Dienststelle view/DOM modules.

---

#### `filterDock/config/ownerRoutes.js`

- **Role:** route map.
- **Lines:** 68 → ~72 (hard 150). AMD 0.
- **Change:** on `singleSelect` only, add `needsFilterDockCommittedDisplayResync: true` and `actionTypes.committedDisplayObserved: "singleSelect/filterDockCommittedDisplayObserved"`.
- **Rules:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `singleSelect/config/actions.js`

- **Role:** action constants.
- **Lines:** 23 → ~24. AMD 0.
- **Add:** `FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED: "singleSelect/filterDockCommittedDisplayObserved"`.
- **Rules:** `amd.mdc`; `naming.mdc`.

#### `singleSelect/config/selectors.js`

- **Role:** chrome strings.
- **Lines:** 25 → ~32. AMD 1 unchanged.
- **Add from existing `chrome`:** `filterDockRootSelector` (`rootSelector`), `globalDockBucketSelector` (`globalDockSelector`), `pageContextDockBucketSelector` (`pageContextDockSelector`), `filterDataIdAttr`, `filterItemWrapperClass`, `committedDisplaySelector`, `committedDisplayParentSelector`.
- **Rules:** `amd.mdc`; `dom.mdc` (catalog only).

#### `view/applySingleSelectCommittedDisplay.js` (create)

- **Role:** view mutator.
- **Lines:** target ~70–90 (hard 150). AMD **1** (`../config/selectors.js`).
- **Factory-scope helpers:**
  - `resolveBucketSelector(_scopeType)` — global vs pageContext chrome selector.
  - `findScopedWrapper(_filterLabel, _scopeType)` — copy Dienststelle find pattern; `document.querySelector` root then bucket then `[data-id]`; `closest("." + filterItemWrapperClass)`. Return null if no document.
  - `chipTextEquals(_el, _caption)` — trim both.
  - `paintChip(_wrapperEl, _caption)` — query `committedDisplaySelector`; if missing or equals, return false; else set `textContent`, `title`; if `aria-label` is empty, set it to caption; return true.
- **Entry:** `__controller(_instance)`  
  Steps: if no instance / no `filterLabel` / no caption string, return false. Find wrapper. `paintChip`.  
  **Alternatively** export `{ findScopedWrapper, paintChip, applyInstance }` as the AMD return if that avoids nested functions — then **no** `__controller` wrapping an object literal of nested functions. Prefer: return `__controller` that takes `(_instance)` and uses factory-scope helpers only.
- **Rules:** `amd.mdc` (helpers at factory scope); `dom.mdc`; `error-handling.mdc` (try/catch in `__controller`, warn+false); `feature-structure.mdc` (`view/`).

#### `effects/handleFilterDockCommittedDisplayObserved.js` (create)

- **Role:** effect orchestrator (display-only).
- **Lines:** target ~50–70 (hard 150). AMD **1** (`../view/applySingleSelectCommittedDisplay.js`).
- **Entry:** `__controller(_KDB)`  
  1. try/catch.  
  2. Read `instancesById` from `_KDB.state.filters.singleSelect`. If missing, return.  
  3. For each id: record = instancesById[id]. Skip unless `selectionOwner === "singleSelect"` and `hostStatus` present/active as other SS writers do (`status === "active"` ∧ `hostStatus === "present"`). Skip unless `currentSelection.displaySource === "table"`. Skip if `isCommitInProgress === true`. Skip if `displayValue` null/empty.  
  4. Call the view `__controller(record)`.  
  5. No reconcile, no `writeValues`, no popup.  
- **Return:** `__controller`
- **Rules:** `amd.mdc`; `state.mdc` (read-only); `error-handling.mdc`; `events.mdc` (no new emit).

#### `actions/dispatchSingleSelectAction.js`

- **Role:** dispatch router.
- **Lines:** 45 → ~52. AMD **5 → 6**.
- **Add import:** `"../effects/handleFilterDockCommittedDisplayObserved.js"` after `processFilterDockHandoff` (keep literal order stable: actions, routeIdentity, tabMutation, processFilterDockHandoff, **new handler**, selectors).
- **Branch:** `else if (action.type === _actions.FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED) { _handleCommittedDisplay(_KDB); }` **before** the ERROR else-if. Do **not** call `processFilterDockHandoff`.
- **Keep** returning `readSingleSelectState`.
- **Rules:** `amd.mdc`; `module-public-api.mdc` (no new method); `error-handling.mdc` (existing try/catch).

#### `actions/parameterSet/handleParameterSetResync.js`

- **Role:** SET-tail sequencer.
- **Lines:** 88 → ~95. AMD **4 → 5**.
- **Add import:** `"../../effects/handleFilterDockCommittedDisplayObserved.js"`.
- **After** successful `settleResult` + optional `inventoryGeneration` assignment (the inner `else` that currently ends ~line 56), call `_handleCommittedDisplay(_KDB)` — also after the function is about to `return result` when `result.ok !== false` at line 63, **or** once just before that successful return so failed/cancelled paths never paint. Simplest: immediately before `return result || …` at line 63, `if (result && result.ok !== false) { _handleCommittedDisplay(_KDB); }`. Do **not** paint inside catch / mergeTerminalCleanup failure.
- **Rules:** `amd.mdc`; `error-handling.mdc` (existing try/catch); **no DOM in this file** (handler owns DOM).

---

## Section J. Acceptance

1. Allowlist only. New files exist.
2. Idempotent paint. Table gate. Commit skip. Scope+label wrapper.
3. Line/AMD budgets.
4. SSS route unchanged. Restore cores untouched.

---

## Section K. Forbidden

`.mdc`; git; characterData; CSS overlay; H0 file; Dienststelle sanitizer; `processFilterDockHandoff` for this action; toast PROGRAM.

---

## Section L. Report

Pre-flight echo, file table with lines/AMD, deviations, J, open questions.

---

## Section M. Cognos

After SET: chip caption vs owner `"table"`. Host `.d` may stay `DST_LTNG`. Open popup is H0 (separate). If chip stays token until a dock childList, SET-tail should already have painted — report if not.
