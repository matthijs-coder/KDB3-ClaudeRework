# Execution Spec: dienststelle cleanup tranche D

**Status:** Draft for execution approval
**Module / contract:** `_____________KDB3API/contracts/dienststelle.md`, `_____________KDB3API/contracts/filterDock.md`
**Phase:** rule-alignment micro-fixes after Dienststelle/filterDock resync work
**Authoring AI:** GPT-5.5, 2026-06-05
**Executing AI:** TBD
**Reviewer:** user / supervising AI

---

## Section A. Pre-flight read list

The executing AI must read each file below before editing and echo one sentence per item:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/contracts/dienststelle.md`
12. `_____________KDB3API/contracts/filterDock.md`
13. This execution spec.

If the executing AI cannot summarize why this tranche avoids observation, reconcile, popup timing, history semantics, and route refactors, stop before editing.

---

## Section B. Scope

This tranche has exactly three approved cleanup changes:

1. Split pure support helpers out of `effects/applyStoredDienststelleScopeValues.js` so the facade returns below the 150-line file limit.
2. Harden `filterDock/runtime/cleanupFilterDockRuntime.js` so generic timer cleanup also clears array timer handles.
3. Remove the unused `buildDomRefCacheKey` export from `view/resolveScopedDienststelleFilterDom.js`.

Allowed production file to create:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/dienststelleScopeApplySupport.js
```

Allowed production files to modify:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/applyStoredDienststelleScopeValues.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/runtime/cleanupFilterDockRuntime.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/resolveScopedDienststelleFilterDom.js
```

No other files are in scope.

---

## Section C. Required edits

### C1. Extract pure scope-apply helpers

Create `effects/dienststelleScopeApplySupport.js` as a focused AMD support module.

Move only these pure helper functions from `effects/applyStoredDienststelleScopeValues.js`:

```txt
toCognosValues
mapClearResult
toAppliedResult
expectedForScope
```

Rules:

- Preserve function names and behavior exactly.
- Preserve empty-array handling exactly.
- Preserve return shapes exactly.
- The support module may return an object with those four function keys.
- Do not move `applyScopeValues`, `waitPhaseStability`, `runPhase`, or `applyStoredDienststelleScopeValues` in this tranche.
- Do not change the public export/signature of `applyStoredDienststelleScopeValues`.

### C2. Trim `applyStoredDienststelleScopeValues.js`

Update `effects/applyStoredDienststelleScopeValues.js` to import and call the support helper object from C1.

Rules:

- Keep the existing async phase chain in this file.
- Keep `applyScopeValues`, `waitPhaseStability`, `runPhase`, and the public entry function in this file.
- Preserve all blocker strings exactly.
- Preserve all `console.error` / `console.warn` strings exactly.
- Preserve `resolveDienststelleReplayApplyOrder` usage and phase order.
- Preserve global/pageContext sequencing and short-circuit behavior.
- Preserve clear-vs-replace behavior for empty scopes.
- Preserve `waitForStableDienststelleScopeValues` usage.
- Keep the file under 150 lines after the extract.

If the file still exceeds 150 lines after moving only the pure helpers, stop and report. Do not perform a second async-chain split without supervisor approval.

### C3. Harden generic filterDock timer cleanup

In `filterDock/runtime/cleanupFilterDockRuntime.js`, extend the existing generic `clearTimers` loop so it clears array handles in addition to scalar numeric handles.

Rules:

- Preserve current scalar timer behavior.
- Preserve cleanup call order.
- Preserve `managePopupDisplayResync.detach(...)` behavior and order.
- Do not modify popup resync scheduling, confirm-ladder delay values, observer lifecycle, or detach logic.
- Do not add a new runtime bucket.
- Use a local loop variable at factory/helper scope style consistent with the file.

The intended behavior is only defensive: if a timer bucket contains an array such as `popupDisplayResyncConfirmLadder`, each handle is cleared before the key is deleted.

### C4. Remove unused DOM ref cache key export

In `dienststelle/view/resolveScopedDienststelleFilterDom.js`, remove:

```txt
buildDomRefCacheKey
```

Rules:

- Remove both the function and its return-object key.
- Preserve existing exports:
  - `readFilterScopeBucket`
  - `findScopedFilterWrapper`
  - `findScopedPopupMount`
- Preserve all DOM lookup behavior.
- Do not remove `readFilterScopeBucket` in this tranche even if it appears unused.
- Before editing, confirm there are no callers of `buildDomRefCacheKey`; after editing, confirm there are zero production hits.

---

## Section D. Explicitly out of scope

The executing AI must not:

- Edit `filterDock/observation/**`.
- Edit `dienststelle/effects/handleDienststelleHistoryReplay.js`.
- Edit reconcile, popup, history, defaulting, map-handoff, Sicht, widget, tableData, or committed-display observer behavior.
- Change `applyStoredDienststelleScopeValues` public signature or return contract.
- Change replay apply order, stability waits, blocker strings, Cognos clear/replace semantics, or logging strings.
- Change popup resync timing, confirm-ladder delays, observer options, detach order, or popup action routing.
- Deduplicate `readFilterWrapperCount`, `readDockRoot`, `SCOPE_BUCKETS`, variant keys, or Cognos filter API lookups.
- Split `routeDienststelleDispatch.js`.
- Split or reorganize `filterDock/observation`.
- Move `resolveDienststelleDataKey.js`.
- Change Dienststelle or filterDock state shape, runtime top-level shape, public API shape, action strings, `_KDB.events`, CSS, contracts other than this spec, rules, templates, legacy trees, or `TEST/`.

---

## Section E. Rules to apply

All touched/new production files:

- `amd.mdc` — one full-compact AMD `define`, no ES module syntax, helpers at factory scope.
- `feature-structure.mdc` — each touched/new JS file remains under 150 lines.
- `naming.mdc` — technical identifiers stay English and precise.
- `error-handling.mdc` — existing replay/apply boundary logging remains unchanged.

Dienststelle support extract:

- `state.mdc` — no state shape changes.
- `dom.mdc` — no live DOM refs in state or action payloads.
- `module-public-api.mdc` — public entry functions and owner dispatch surfaces do not change.

filterDock timer hardening:

- `runtime.mdc` — runtime resources must be cleaned up; cleanup remains owner-owned.
- `events.mdc` — no events are introduced.

---

## Section F. Acceptance criteria

AC1. `effects/dienststelleScopeApplySupport.js` exists and exports only the pure support functions required by C1.

AC2. `effects/applyStoredDienststelleScopeValues.js` is under 150 lines.

AC3. `applyStoredDienststelleScopeValues` keeps the same public AMD export, function signature, return shapes, blocker strings, phase order, stability waits, clear/replace semantics, and logging strings.

AC4. No async phase function from `applyStoredDienststelleScopeValues.js` was moved in this tranche.

AC5. `cleanupFilterDockRuntime.js` clears both numeric timer handles and array timer handles, while preserving existing scalar behavior and cleanup order.

AC6. Popup resync scheduling, confirm-ladder delays, observer options, detach behavior, and dispatch behavior are unchanged.

AC7. `buildDomRefCacheKey` has zero production hits after the edit.

AC8. `resolveScopedDienststelleFilterDom.js` still exports `readFilterScopeBucket`, `findScopedFilterWrapper`, and `findScopedPopupMount`.

AC9. No files outside the allowed create/modify list were changed.

AC10. All touched/new JS files are under 150 lines and AMD-shaped.

AC11. `ReadLints` is clean on all touched/new production files.

AC12. Static inspection confirms AMD dependency arrays and factory parameters resolve.

---

## Section G. Verification checklist

The executing AI must run or perform:

1. Line counts for all touched/new production files.
2. Search for `buildDomRefCacheKey`; expected result: zero production hits.
3. Search/import check for `dienststelleScopeApplySupport.js`; expected result: imported only by `applyStoredDienststelleScopeValues.js`.
4. Static scan of `applyStoredDienststelleScopeValues.js` for unchanged blocker/logging strings.
5. Static scan of `cleanupFilterDockRuntime.js` confirming array and numeric timer branches.
6. `ReadLints` on all touched/new production files.

Manual Cognos smoke is not required for this tranche, but any available history replay smoke should focus on replay apply order and no blocker-regression.

---

## Section H. Reviewer handoff

The executing AI final report must include:

1. Pre-flight echo for Section A.
2. Tranche scope confirmation: exactly the three approved cleanup changes.
3. File checklist with before/after line counts.
4. Extract summary for `dienststelleScopeApplySupport.js`.
5. Confirmation that async replay apply behavior was not changed.
6. Timer cleanup hardening summary.
7. Dead export removal confirmation and search result.
8. AC1-AC12 pass/fail.
9. Lint result.
10. Any uncertainty or deviation.

---

## Section I. Approval log

| Date | Action | Notes |
|------|--------|-------|
| 2026-06-05 | Execution spec drafted | Three-item micro cleanup after three-round readonly audit |
| TBD | User approval | |
| TBD | Execution completed | |
