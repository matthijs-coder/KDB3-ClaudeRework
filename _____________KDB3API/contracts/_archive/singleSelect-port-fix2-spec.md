# Fix Spec: `singleSelect` CP-2 Review Iteration 2

> Focused fix-spec after CP-2 eindreview of the split output.
> Apply only these fixes. Do not widen scope.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/singleSelect.md`
**Base execution spec:** `_____________KDB3API/contracts/singleSelect-port-execution-spec.md`
**Prior fix spec:** `_____________KDB3API/contracts/singleSelect-port-fix-spec.md`
**Reviewer:** GPT-5.5, 2026-05-22

---

## Section A. Mandatory read list

Read these before editing and echo one sentence per item:

1. `_____________KDB3API/contracts/singleSelect.md`
2. `_____________KDB3API/contracts/singleSelect-port-execution-spec.md`
3. `_____________KDB3API/contracts/singleSelect-port-fix-spec.md`
4. `_____________KDB3API/.cursor/rules/state.mdc`
5. `_____________KDB3API/.cursor/rules/runtime.mdc`
6. `_____________KDB3API/.cursor/rules/dom.mdc`
7. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
8. `_____________KDB3API/.cursor/rules/amd.mdc`

---

## Section B. Allowed edit scope

You may edit only:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/state/selectors.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/runSingleSelectInteraction.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/restorePopupSelection.js
```

Do not edit any other file.

---

## Section C. Required fixes

### F1 — Clone `lastInteraction` in public full-state selector

File:

```txt
state/selectors.js
```

Problem:

`readSingleSelectState()` now deep-clones `byScope`, but it still returns `lastInteraction` by reference via `Object.assign({}, state, ...)`. This exposes mutable internal owner state through `getState()`.

Required fix:

- Add or reuse a small clone helper for flat serializable objects.
- `readSingleSelectState()` must clone `lastInteraction` when present.
- Keep `meta` and all per-filter states cloned as currently implemented.
- Do not use `JSON.stringify` / `JSON.parse`.

Acceptance:

- Mutating `getState().lastInteraction` cannot mutate `_KDB.state.filters.singleSelect.lastInteraction`.

### F2 — Preserve mount options when calling `restorePopupSelection`

File:

```txt
effects/runSingleSelectInteraction.js
```

Problem:

`runInteraction()` builds `interactionOptions` with only `{ actionType, filterState }`, so approved injected owner-local helpers such as `options.resolveFilterEl` are not passed to `restorePopupSelection()`. This forces fallback document lookup and defeats the contract's narrow integration path.

Required fix:

- Build `interactionOptions` by merging all incoming `_options` with `actionType` and `filterState`, for example:

```js
var interactionOptions = Object.assign({}, options, {
  actionType: options.actionType,
  filterState: filterState
});
```

- Use this same merged object for every `_restorePopupSelection(...)` call in `runInteraction()`.
- Do not change commit/cancel option handling.

Acceptance:

- If `mount({ resolveFilterEl: fn })` was used, `restorePopupSelection()` can call that function.

### F3 — Prevent stale/wrong filter DOM resolution

File:

```txt
effects/restorePopupSelection.js
```

Problems:

1. `resolveFilterEl()` returns `_runtime.domRefs.filterEl` without verifying it matches the current `filterKey`, so a later handoff can mutate the previous filter's popup.
2. Fallback DOM lookup searches the entire dock by label only. If the same label exists in global and pageContext, it can select the wrong filter element.

Required fix:

- Only reuse `_runtime.domRefs.filterEl` when `_runtime.domRefs.filterKey === _handoffContext.filterKey`.
- When falling back to DOM lookup, scope the search by `filterScope`:
  - `global` should prefer `selectors.globalDockSelector`;
  - `pageContext` should prefer `selectors.pageContextDockSelector`;
  - fallback to the root selector only if the scoped dock is missing.
- Continue to match by `[data-id] === filterLabel` inside the chosen scope.
- Do not read `_KDB.runtime.filterDock`.
- Do not add a listener or observer.

Acceptance:

- A pageContext handoff does not reuse a stale global filter DOM ref.
- A global and pageContext filter with the same label resolve within the correct dock scope when the relevant selectors exist.

---

## Section D. Forbidden actions

Do not:

- modify `filterDock`;
- modify `KDB.js`;
- modify `eventSubscribe.md`;
- create `events/eventNames.js`;
- create `specialRights/`;
- create `singleSelectHistoryAdapter.js`;
- modify `collectReplayHandlers.js`;
- modify contracts/rules/templates;
- read or write `_KDB.runtime.filterDock`;
- add dock-level listeners or dock observers;
- alter behavior beyond the fixes above.

---

## Section E. Verification

After edits:

1. Run lints on the three edited files.
2. Confirm all three files remain at or under the hard line limit.
3. Confirm no forbidden files changed.
4. Confirm `lastInteraction` is cloned in full-state selector output.
5. Confirm `resolveFilterEl` injection reaches `restorePopupSelection`.
6. Confirm cached DOM refs are reused only when `filterKey` matches.
7. Confirm scoped fallback lookup uses global/pageContext dock selectors.
8. Report exact files changed and F1-F3 pass/fail.
