ss # Fix Spec: `singleSelect` / `filterDock` cleanup after visual-close tranche

> Cleanup-only fix spec after review of the visual/class alignment + popup close implementation.
> Do not widen behavior. Do not touch CSS unless lint requires it.

---

**Status:** Ready for execution after approval  
**Scope:** Cleanup only  
**Related specs:** `singleSelect-visual-close-fix-spec.md`, `singleSelect-popupReady-sync-contractdelta.md`  
**Reviewer:** GPT-5.5, 2026-05-22

---

## 1. Goal

Make the implementation rule-conformant after review:

1. Fix file-size / import-count violations.
2. Strengthen `filterDock` target verification for OK/Cancel live DOM actions.
3. Document or avoid the global close-popup DOM query.
4. Preserve existing behavior and ownership boundaries.

This is not a behavior expansion.

## 2. Mandatory Read List

Read and echo one sentence per item before editing:

1. `_____________KDB3API/contracts/singleSelect.md`
2. `_____________KDB3API/contracts/filterDock.md`
3. `_____________KDB3API/contracts/singleSelect-popupReady-sync-contractdelta.md`
4. `_____________KDB3API/contracts/singleSelect-visual-close-fix-spec.md`
5. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
6. `_____________KDB3API/.cursor/rules/dom.mdc`
7. `_____________KDB3API/.cursor/rules/runtime.mdc`
8. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
9. `_____________KDB3API/.cursor/rules/state.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`

## 3. Allowed Scope

Allowed to edit:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/createFilterDockController.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/config/actions.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/clickOriginalPopupButton.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/closeActivePopup.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/runSingleSelectInteraction.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
```

Allowed to create focused helper files only if needed:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/dispatchFilterDockDomAction.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/requestFilterDockPopupAction.js
```

Do not edit by default:

```txt
_____________KDB3API/KDB3/css/singleSelect.css
_____________KDB3API/KDB3/js/KDB.js
_____________KDB3API/architecture/eventSubscribe.md
_____________KDB3API/.cursor/rules/
legacy reference trees
```

CSS may only be touched if lint requires it, and the report must say why.

## 4. Required Fixes

### F1 - Split oversized `filterDock` controller

Problem:

`createFilterDockController.js` is over the 150-line hard limit and has too many imports after the DOM-action effects were added.

Required fix:

- Move the two DOM action branches out of `dispatchInternal`.
- Keep public API shape unchanged: `{ mount, destroy, dispatch, getState }`.
- Prefer a focused helper `effects/dispatchFilterDockDomAction.js` handling:
  - `filterDock/clickOriginalButtonRequested`
  - `filterDock/closeActivePopupRequested`
- `createFilterDockController.js` should be at or below 150 lines after the split.
- If it cannot be brought under 150 lines without a larger refactor, report the exact reason and keep behavior unchanged.

Acceptance:

- Public API shape is unchanged.
- DOM-action handling remains inside `filterDock`.
- `createFilterDockController.js` no longer imports the individual DOM action effects directly if the helper is created.

### F2 - Split oversized `singleSelect` effects

Problem:

`runSingleSelectInteraction.js` and `commitConfirmedSelection.js` exceed the 150-line hard limit after duplicate filterDock request helpers were added.

Required fix:

- Move duplicated filterDock request helpers into:

```txt
effects/requestFilterDockPopupAction.js
```

- Expose focused functions, for example:
  - `requestOriginalButtonClick(_KDB, _handoffContext, _buttonTid, _options)`
  - `requestClosePopup(_KDB, _options)`
- `singleSelect` must still request close/original-button behavior only via `_KDB.api.filterDock.dispatch(...)` or approved injected options.
- `singleSelect` must not read `_KDB.runtime.filterDock`.

Acceptance:

- `runSingleSelectInteraction.js` and `commitConfirmedSelection.js` are at or below 150 lines where possible.
- Duplicate request helper logic is removed.
- `singleSelect/filterDockPopupReady` behavior is unchanged.

### F3 - Strengthen active filter matching

Problem:

`clickOriginalPopupButton.js` verifies mostly by label. If global and pageContext contain the same label, it can accept the wrong active popup.

Required fix:

- Verify the active filter against payload using the best available identity:
  1. prefer exact `filterId` when active identity can be reconstructed;
  2. otherwise compare `filterKey`;
  3. fallback to label only with a `console.warn`.
- Use only `filterDock` owned runtime/DOM inside `filterDock`.
- Do not put DOM nodes in payload.
- Do not write state.

Implementation guidance:

- Reconstruct active identity from `runtime.domRefs.activeFilterEl` using the same scope/label logic as `filterDock` identity resolution where practical.
- If a focused import from existing `readFilterIdentity.js` is too costly for file size/import count, use a local small helper and document the fallback warning.

Acceptance:

- A global and pageContext filter with the same label do not silently match the wrong active popup.
- Missing identity data results in a no-op or warning, not an unsafe click.

### F4 - Close popup DOM query discipline

Problem:

`closeActivePopup.js` uses:

```js
document.querySelector("#filterOutClickCatcher")
```

That may be a legitimate Cognos portal/out-click-catcher exception, but DOM rules require it to be scoped or explicitly documented.

Required fix:

Choose one:

- **Path A:** Resolve the close target from filterDock-owned active popup/filter runtime where possible, and only fallback to the document query with a comment explaining the Cognos portal exception.
- **Path B:** Keep the document query but add a concise comment that this is a Cognos portal/out-click-catcher exception and not a new module-root query pattern.

Do not add listeners or observers.

Acceptance:

- The close action remains filterDock-owned.
- The global query is either avoided or explicitly justified in code.

### F5 - Preserve behavior and boundaries

Must remain true:

- `singleSelect/filterDockPopupReady` does restore/sync and returns before intent derivation.
- OK/Cancel live DOM actions remain filterDock-owned.
- No new events are added.
- `specialRights` is not ported.
- No dock-level listener or long-lived dock observer is added in `singleSelect`.
- No `_KDB.runtime.filterDock` reads from `singleSelect`.
- No `_KDB.state.filters.singleSelect` writes from `filterDock`.
- No `_KDB.state.filters.filterDock` writes from `singleSelect`.

## 5. Verification

After edits:

1. Run lints on every touched file.
2. Confirm touched JS files are at or below 150 lines, or report the exact exception.
3. Static search confirms:
   - no `runtime.filterDock` in `singleSelect/`;
   - no `state.filters.singleSelect` writes in `filterDock/`;
   - no `_KDB.events` or `filter:applied`;
   - no `eventSubscribe.md` change.
4. Confirm AMD imports resolve.
5. Report F1-F5 pass/fail.
6. Manual Cognos smoke remains required:
   - open normal singleSelect filter;
   - Alle selected by default;
   - selecting one option leaves only one checked row;
   - OK commits/closes without flicker loop;
   - Cancel reverts/closes.

## 6. Executing-AI Prompt

```text
You are the executing AI for the KDB3 singleSelect/filterDock cleanup tranche.

Project root:
c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05

Read first:
1. _____________KDB3API/contracts/singleSelect.md
2. _____________KDB3API/contracts/filterDock.md
3. _____________KDB3API/contracts/singleSelect-popupReady-sync-contractdelta.md
4. _____________KDB3API/contracts/singleSelect-visual-close-fix-spec.md
5. _____________KDB3API/contracts/singleSelect-filterDock-cleanup-fix-spec.md
6. Relevant .cursor/rules: feature-structure, dom, runtime, module-public-api, state, amd.

Echo one sentence per file/rule before editing.

Implement only `singleSelect-filterDock-cleanup-fix-spec.md`.
This is cleanup only, not behavior expansion.

Primary goals:
- fix file-size/import-count rule violations;
- strengthen filterDock active filter matching for original OK/Cancel actions;
- preserve singleSelect popupReady sync-only behavior;
- preserve ownership boundaries.

Hard constraints:
- Do not edit outside the allowed scope.
- Do not change CSS unless required by lint.
- Do not add events or edit eventSubscribe.md.
- Do not port specialRights.
- Do not add new dock listeners/observers in singleSelect.
- Do not read `_KDB.runtime.filterDock` from singleSelect.
- Do not let filterDock write `_KDB.state.filters.singleSelect`.
- Do not let singleSelect write `_KDB.state.filters.filterDock`.

After edits return:
- pre-flight echo;
- files changed with line counts;
- F1-F5 pass/fail;
- lint result;
- static forbidden-access checks;
- remaining manual smoke steps.
```

