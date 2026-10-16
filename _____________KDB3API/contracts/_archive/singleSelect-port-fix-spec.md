# Fix Spec: `singleSelect` CP-2 Review Iteration 1

> Focused fix-spec after CP-2 review of the first executing-AI output for `singleSelect`.
> Apply only these fixes. Do not widen scope.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/singleSelect.md`
**Base execution spec:** `_____________KDB3API/contracts/singleSelect-port-execution-spec.md`
**Reviewer:** GPT-5.5, 2026-05-22

---

## Section A. Mandatory read list

Read these before editing:

1. `_____________KDB3API/contracts/singleSelect.md`
2. `_____________KDB3API/contracts/singleSelect-port-execution-spec.md`
3. `_____________KDB3API/.cursor/rules/state.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/runtime.mdc`
6. `_____________KDB3API/.cursor/rules/dom.mdc`
7. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
8. `_____________KDB3API/.cursor/rules/amd.mdc`

Echo one sentence per item before editing.

---

## Section B. Allowed edit scope

You may edit only:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/state/selectors.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/runSingleSelectInteraction.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/restorePopupSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/createSingleSelectController.js
```

Do not edit any other file.

---

## Section C. Required fixes

### F1 — Deep-clone public selector snapshots

File:

```txt
state/selectors.js
```

Problem:

`readSingleSelectState()` shallow-clones `byScope.global` and `byScope.pageContext`, but leaves nested per-filter state objects by reference. This violates `state.mdc` / `module-public-api.mdc`: consumers of public reads must not receive mutable internal state references.

Required fix:

- Add a factory-scope helper that clones one per-filter state, including `currentSelection`, `backupSelection`, and `pendingSelection`.
- Add a factory-scope helper that clones one scope map by iterating filter labels.
- `readSingleSelectState()` must return cloned `byScope.global` and `byScope.pageContext` maps with cloned per-filter entries.
- `readSingleSelectFilterState()` may reuse the same clone helper.
- Do not use JSON stringify/parse.

Acceptance:

- Mutating the object returned by `getState()` cannot mutate `_KDB.state.filters.singleSelect.byScope.*.*`.

### F2 — Case-insensitive `specialSingleSelect` deferral

File:

```txt
effects/runSingleSelectInteraction.js
```

Problem:

`needsSpecialRightsData()` compares `capabilities.condition` to lowercase literals, but filterDock/legacy may provide `"Personengruppe"` or `"Dienststellenleitung"`. This lets `specialSingleSelect` proceed into core handling even though CP-1 deferred `specialRights` / `specialSingleSelect` to a separate future module.

Required fix:

- Normalize `capabilities.condition` with `String(...).trim().toLowerCase()`.
- Treat both `personengruppe` and `dienststellenleitung` as deferred.
- Keep behavior for normal `singleSelect` unchanged.

Acceptance:

- A payload with `filterType: "specialSingleSelect"` and condition `"Personengruppe"` or `"Dienststellenleitung"` logs the deferred warning and does not mutate per-filter selection state beyond any already unavoidable pre-checks.

### F3 — `restorePopupSelection` must either preserve legacy footer/hydration or explicitly block

File:

```txt
effects/restorePopupSelection.js
```

Problem:

The first implementation omits important legacy behavior from `restorePopupSelection.js`: custom footer creation, DOM hydration from selected Cognos option, and out-click pending revert. The execution report calls this a reduced DOM port. For direct-port CP-2, silent reduction is not acceptable as "rule-alignment only".

Required fix:

Choose one of these two paths:

#### Path A — implement the owner-local legacy behavior

Implement these legacy-equivalent functions without reading `_KDB.runtime.filterDock`:

- `ensureFooter(filterEl)` creates `.KDB_singleSelectFooter` when missing, hides the original Cognos footer, and creates Cancel / Fertig buttons with the same `data-tid` values as legacy.
- `hydrateStateFromPopup(popupMount, filterState)` performs the one-shot selected-option read and updates current/backup/pending exactly like legacy.
- `bindOutClickRevert(runtime, filterState)` registers a cleanup-tracked one-shot listener on `#filterOutClickCatcher` only if available; store cleanup under `_KDB.runtime.singleSelect.listeners`.
- Keep observer behavior out of scope unless it can be implemented as short-lived owner-local popup observer with cleanup in `_KDB.runtime.singleSelect.observers`. Do not create a dock-level observer.

#### Path B — explicit blocker

If Path A cannot be done within the file-size/import rules without a clean split, do not add partial behavior. Instead:

- Leave code unchanged except for a clear `console.warn("[singleSelect.restorePopupSelection] DOM restore requires approved split")` at the point where behavior is missing.
- Report this as an unresolved blocker requiring reviewer action.

Preferred: Path A if possible without exceeding the hard line limit. If the file exceeds 150 lines, stop and report that a split file is required; do not silently exceed the limit.

Acceptance:

- No silent loss of legacy footer/hydration/out-click behavior.
- No reads from `_KDB.runtime.filterDock`.
- No dock-level listener or long-lived dock observer.
- Any created listener has a cleanup path under `_KDB.runtime.singleSelect.listeners`.

### F4 — Controller import/spec mismatch

File:

```txt
createSingleSelectController.js
```

Problem:

The base execution spec listed `mapFilterDockHandoff` and `ensureFilterState` as direct controller imports, but the implementation delegates both through `runSingleSelectInteraction.js`. This is acceptable only if explicitly documented by structure and still satisfies behavior.

Required fix:

- No code change is required if F1-F3 pass.
- In the final report, list this as an approved implementation deviation: delegation through `runSingleSelectInteraction.js` keeps the controller smaller and still applies the rule checklist.

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
- add dock-level listeners or dock observers.

---

## Section E. Verification

After edits:

1. Run lints on edited files.
2. Confirm no forbidden files changed.
3. Confirm `getState()` / `readSingleSelectState()` does not expose nested mutable state references.
4. Confirm `specialSingleSelect` with `Personengruppe` / `Dienststellenleitung` defers.
5. Confirm `restorePopupSelection` is either behavior-preserving for footer/hydration/out-click or explicitly reported as blocked.
6. Report exact files changed and whether F1-F4 pass.
