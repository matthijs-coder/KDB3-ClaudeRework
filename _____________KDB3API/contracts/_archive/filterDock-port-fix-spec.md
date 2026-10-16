# Fix Spec: `filterDock` CP-2 review iteration

> Focused fix iteration after CP-2 review of the first `filterDock` Mode 2 implementation.
> Apply only the fixes listed here. Do not expand scope.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/filterDock.md`
**Base execution spec:** `_____________KDB3API/contracts/filterDock-port-execution-spec.md`
**Reviewer:** GPT-5.5, 2026-05-17

---

## A. Scope

Modify only files under:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/
```

Do not modify:

```txt
KDB.js
eventSubscribe.md
singleSelect/
sicht/
dienststelle/
TEST/
legacy reference trees
.cursor/rules/
```

---

## B. Required fixes

### F1 — Preserve disabled OK/Cancel behavior

**File:** `effects/resolveFilterInteraction.js`

**Problem:** Disabled OK/Cancel clicks are no longer recognized as disabled OK/Cancel button clicks. The current logic computes `clickedOk` / `clickedCancel` only when `!disabled`, making the later disabled guard unreachable. A disabled OK/Cancel click can fall through as `"open"`, which is behavior drift from legacy `filterDock/filterDock.js`.

**Required change:**

- Compute raw button matches first:
  - `rawClickedOk`
  - `rawClickedCancel`
- If `(rawClickedOk || rawClickedCancel) && disabled`, return `null`.
- Then compute serializable `clickedOk` / `clickedCancel` as non-disabled values for interaction typing.

**Rules:** direct-port behavior policy, `error-handling.mdc` invalid DOM no-op, `state.mdc` serializable payloads.

### F2 — Reduce `createFilterDockController.js` size

**File:** `createFilterDockController.js`

**Problem:** Current file is over the preferred hard limit from the approved execution spec. It bundles public API, dispatch bridge, runtime initialization, cleanup, disposal warning, and error handling.

**Required change:**

Split focused factory-scope helpers into owned files so `createFilterDockController.js` is at or below 180 lines.

Allowed new files:

```txt
runtime/ensureFilterDockRuntime.js
runtime/cleanupFilterDockRuntime.js
runtime/readDockRoot.js
```

Use only the files needed. Update AMD imports accordingly.

Requirements:

- `ensureFilterDockRuntime.js` initializes all standard runtime buckets.
- `cleanupFilterDockRuntime.js` handles:
  - `clearEvaluationTimer` via injected helper or callback;
  - observer disconnect;
  - AbortController cleanup;
  - fallback listener cleanup;
  - subscriptions;
  - timers;
  - DOM refs and runtime bucket reset.
- `readDockRoot.js` resolves `_KDB.elements.selectors.filterDock.rootSelector` and returns `null` when missing.
- Keep all helpers full-compact AMD modules.
- Do not create vague `helpers/`, `common/`, or `manager/` folders.

**Rules:** `feature-structure.mdc` file-size discipline, `runtime.mdc` cleanup ownership, `amd.mdc` full-compact modules, `naming.mdc` precise folder/file names.

### F3 — Cleanup partial mount if observer binding fails

**File:** `createFilterDockController.js`

**Problem:** `mount()` can bind the click listener successfully, then return `false` if observer binding fails. That leaves a partial runtime listener despite failed mount.

**Required change:**

- If `_bindDockObserver(...)` returns `false` after `_bindDockClickListener(...)` returned `true`, clean the just-created listener/controller runtime before returning `false`.
- Do not dispatch `filterDock/error` for missing dock root. For unexpected bind failure, log a boundary warning/error with context and cleanup partial runtime.
- Preserve idempotency: a later `mount()` attempt must not see stale listener/observer handles from the failed attempt.

**Rules:** `runtime.mdc` no resource without cleanup path, `error-handling.mdc` lifecycle boundary handling, execution spec Section H idempotent mount.

### F4 — Clear runtime pending evaluation merge

**File:** `observation/scheduleObservedStateEvaluation.js`

**Problem:** `_runtime.pendingEvaluationMerge` is created/merged, but not cleared after the scheduled evaluation finishes.

**Required change:**

- Clear `_runtime.pendingEvaluationMerge` in `runScheduledEvaluation` after `evaluateObservedDockState` and `filterDock/evaluationFinished`.
- Also clear it when `clearEvaluationTimer(_runtime)` cancels the scheduled evaluation during destroy.

**Rules:** `runtime.mdc` cleanup, execution spec coalescing semantics.

### F5 — Populate `popup.activeFilterType` when available

**File:** `observation/evaluateObservedDockState.js`

**Problem:** The popup slice always sets `activeFilterType: null`, even though the active filter type is available from `_KDB.state.filters.filterDock.lastClickedFilter` after click handling.

**Required change:**

- Read `_KDB.state.filters.filterDock.lastClickedFilter.filterType` when present.
- Set `popup.activeFilterType` to that value.
- Do not read sibling state or runtime.

**Rules:** `state.mdc` owner state read, execution spec `evaluateObservedDockState` reads active filter id/type where available.

---

## C. Acceptance criteria

1. `ReadLints` clean for all modified and new files.
2. `createFilterDockController.js` is at or below 180 lines.
3. Disabled OK/Cancel clicks return `null` and do not log an `"open"` interaction.
4. Missing dock root still returns `false`, logs a warning, creates no listener/observer, and does not set lifecycle `error`.
5. Observer-bind failure after click listener bind cleans partial listener/controller runtime before returning `false`.
6. `destroy()` remains idempotent and cleans observer, AbortController, fallback listener, scheduled evaluation, timers, subscriptions and DOM refs.
7. `_runtime.pendingEvaluationMerge` is cleared after evaluation and on destroy/cancel.
8. `popup.activeFilterType` is populated from `lastClickedFilter.filterType` when available.
9. No events, no sibling calls, no `KDB.js`, no `eventSubscribe.md`.
10. Static AMD imports resolve.

---

## D. Report back

Return:

1. Files changed/created with line counts.
2. Confirmation per F1-F5.
3. Confirmation per acceptance criteria C1-C10.
4. Any deviation, with rule consulted.
