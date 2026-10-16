# Execution Spec: dienststelle cleanup tranche A

**Status:** Draft for execution approval
**Module / contract:** `_____________KDB3API/contracts/dienststelle.md`
**Phase:** cleanup tranche A, behavior-preserving
**Authoring AI:** GPT-5.5, 2026-06-04
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
12. This execution spec.

If any intended change requires behavior decisions, selector relocation, state-shape removal, runtime-bucket removal, or a contract update, stop and report instead of editing.

---

## Section B. Scope

This tranche is a behavior-preserving cleanup only.

Allowed production files to delete:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/removeDienststelleHostFilter.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/evaluateDienststelleVariantVisibility.js
```

Allowed production files to modify:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/state/initialState.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleWrapperClasses.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/reconcileDienststelleHostScopes.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/readDienststelleHostSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/listDashboardTabScopeIds.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleViewFromState.js
```

Allowed new production files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/reconcileDienststelleScopeDispatch.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/walkDienststellePageContextScopes.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/resolveDienststelleReconcileMode.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/normalizeCognosDienststelleSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/lookupDienststelleFilterApi.js
```

Do not edit contracts, rules, `TEST/`, legacy trees, `filterDock`, `sicht`, `singleSelect`, `specialSingleSelect`, `KDB.js`, `eventSubscribe.md`, or unrelated Dienststelle files in this tranche.

---

## Section C. Non-goals

Do not include these in tranche A:

- Do not remove `readDienststelleFilterState`; it is unused at runtime but remains part of prior published selector/spec context.
- Do not remove `resolution.downstreamValues`; it is unused at runtime but belongs to the contract/state-shape discussion.
- Do not move `view/dienststelleViewSelectors.js` to `config/selectors.js`.
- Do not strip runtime bucket keys from `ensureDienststelleRuntime`, `cleanupDienststelleRuntime`, orchestrator state, or contract.
- Do not merge Cognos lookup logic with `singleSelect`.
- Do not introduce `_KDB.utils.clone` or any new shared utility.
- Do not add header-resync debounce/coalescing.
- Do not remove production logs unless explicitly listed in this spec.

---

## Section D. Required edits

### D1. Delete unused production files

Delete:

```txt
effects/removeDienststelleHostFilter.js
view/evaluateDienststelleVariantVisibility.js
```

Before deleting, search the production tree for AMD import strings and direct references. If either file is referenced by production code, stop and report.

Acceptance:

- No remaining AMD import references to the deleted files.
- No behavior change to inactive variant clearing; `clearDienststelleHostFilter.js` remains the active implementation.

### D2. Remove dead helper in `state/initialState.js`

Remove the unused `createSelectionValue` function only.

Acceptance:

- `initialState()` return shape remains unchanged.
- No `downstreamValues` or other state-shape fields are removed.

### D3. Remove dead export in `view/syncDienststelleWrapperClasses.js`

Remove the exported `findFilterWrapper` helper only if it is still unreferenced.

Acceptance:

- Existing wrapper-class sync behavior remains unchanged.
- Existing `syncDienststelleWrapperClasses` export/signature remains unchanged.

### D4. Extract-only split of `effects/reconcileDienststelleHostScopes.js`

Goal: reduce the file below 150 lines without changing behavior, dispatch order, Promise order, or public AMD return value.

Create:

```txt
effects/reconcileDienststelleScopeDispatch.js
effects/walkDienststellePageContextScopes.js
effects/resolveDienststelleReconcileMode.js
```

Suggested extraction boundaries:

`reconcileDienststelleScopeDispatch.js`:

- Move dispatch/result helpers only:
  - `finishReconcile`
  - `dispatchScopeAction`
  - `dispatchScopeClear`
  - `resolveCommitSourceScope`
  - `isUserClearCommit`
  - `resolveClearedScopeId`
- Export a single object or function set that keeps call sites explicit.

`walkDienststellePageContextScopes.js`:

- Move the page-context serial walk and per-scope default/observe logic:
  - `walkPageScopes`
  - `observePageValue`
  - `defaultScope`
- Preserve serial Promise chaining and dispatch timing.

`resolveDienststelleReconcileMode.js`:

- Move mode/effective-value decisions:
  - `resolveUserConfirmMode`
  - `resolveWalkMode`
  - `readCommittedPageValue`
  - `readEffectiveGlobalValue`
- Do not change mode names or branch semantics.

Keep `reconcileDienststelleHostScopes.js` as the facade/entrypoint exporting the same `__controller` function signature as before.

Acceptance:

- Existing callers keep importing `reconcileDienststelleHostScopes.js`.
- The facade remains under 150 lines.
- Every new file is under 150 lines.
- Reconcile modes `sync`, `startup`, and `userCommit` behave identically by static inspection.
- User clear, global defaulting, pageContext defaulting, and reducer dispatch payload fields are unchanged.

### D5. Extract-only split of `effects/readDienststelleHostSelection.js`

Goal: reduce the file below 150 lines without changing the public API used by callers.

Create:

```txt
effects/normalizeCognosDienststelleSelection.js
effects/lookupDienststelleFilterApi.js
```

Suggested extraction boundaries:

`normalizeCognosDienststelleSelection.js`:

- Move raw Cognos value normalization:
  - `normalizeHostValue`
  - `readFilterValues`
- Preserve returned selection shape:

```js
{
  displayValue: string,
  useValue: string,
  source: string
}
```

`lookupDienststelleFilterApi.js`:

- Move host filter lookup and scope helpers:
  - `lookupFilterApi`
  - `listPageContextScopes`
  - `normalizeScopeId`
  - `resolveRawPageContextScope`
- Export `normalizeScopeId` for reuse by `listDashboardTabScopeIds.js`.

Keep `readDienststelleHostSelection.js` as a facade with the same exported API expected by existing imports.

Acceptance:

- Existing imports of `readDienststelleHostSelection.js` still work.
- Selection object shape and null/fallback behavior are unchanged.
- No merge with `singleSelect` lookup helpers.
- Every touched/new file is under 150 lines.

### D6. Deduplicate `normalizeScopeId` in `effects/listDashboardTabScopeIds.js`

Replace the local `normalizeScopeId` implementation by importing the helper exported from `lookupDienststelleFilterApi.js`.

Acceptance:

- Returned tab scope id list is unchanged.
- No dependency cycle is introduced.
- Import count stays within rule limits.

### D7. Remove write-only `domRefs` writes

Remove only Dienststelle `domRefs` cache writes that are not read anywhere:

- from `view/syncDienststelleViewFromState.js`;
- from `view/syncDienststelleWrapperClasses.js`.

Do not remove the `domRefs` bucket from runtime initialization or cleanup in this tranche.

Acceptance:

- DOM sync still resolves current DOM from scoped queries / selectors.
- No runtime bucket keys are removed.
- No state shape changes.

---

## Section E. Rules to apply by touched area

All touched production files:

- `amd.mdc` — full-compact AMD modules; one `define`; no ES module syntax; factory-scope helpers only.
- `naming.mdc` — English technical identifiers; slash-style action names unchanged; no vague new names.
- `feature-structure.mdc` — files under 150 lines; focused responsibility; avoid import-count growth.

Effects:

- `error-handling.mdc` — preserve existing boundary behavior; do not add silent catches.
- `state.mdc` — no foreign state writes; preserve owned state shape.
- `module-public-api.mdc` — no new public API surface.

View:

- `dom.mdc` — no DOM refs in `_KDB.state`; no new live refs; no selector relocation in this tranche.
- `runtime.mdc` — do not remove runtime bucket keys without contract approval.

---

## Section F. Forbidden actions

The executing AI must not:

- Change Dienststelle behavior, defaults, history, Sicht coupling, widget downstream behavior, popup behavior, or header-resync behavior.
- Change any action type strings.
- Change any public API shape.
- Remove or rename `readDienststelleFilterState`.
- Remove `resolution.downstreamValues`.
- Remove runtime bucket keys.
- Move selectors to `config/selectors.js`.
- Add new shared utilities under `_KDB.utils`.
- Merge with `singleSelect` Cognos lookup helpers.
- Touch `filterDock`.
- Touch contracts/rules/templates.
- Touch legacy trees or `TEST/`.
- Commit, push, or change git config.

---

## Section G. Acceptance criteria

AC1. The two deleted files have no remaining production references.

AC2. `initialState()` returns the same state shape as before.

AC3. `syncDienststelleWrapperClasses` keeps the same public export and behavior.

AC4. `reconcileDienststelleHostScopes.js` and every new helper file are under 150 lines.

AC5. Reconcile behavior is extract-only: same entrypoint, same mode names, same dispatch action types, same payload field names, same Promise sequencing.

AC6. `readDienststelleHostSelection.js` keeps the same facade API and returned selection shapes.

AC7. `listDashboardTabScopeIds.js` uses the shared `normalizeScopeId` without changing returned values.

AC8. Removed `domRefs` writes are not read anywhere and no runtime bucket key is removed.

AC9. No forbidden action from Section F occurred.

AC10. `ReadLints` is clean on all touched production files.

AC11. Static inspection confirms AMD imports resolve and no import count exceeds rule limits.

---

## Section H. Reviewer handoff

The executing AI final report must include:

1. Pre-flight echo for Section A.
2. File checklist with line counts before/after.
3. Deleted files and reference-search result.
4. New helper files and the exact functions moved into each.
5. Confirmation that behavior was extract-only.
6. AC1-AC11 pass/fail.
7. Lint result.
8. Any uncertainty or deviation.

