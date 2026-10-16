# Execution Spec: dienststelle cleanup tranche B

**Status:** Draft for execution approval
**Module / contract:** `_____________KDB3API/contracts/dienststelle.md`
**Phase:** cleanup tranche B, behavior-preserving
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

If any intended change would alter state shape, public API, selector placement, Cognos payload semantics, popup/committed label behavior, history behavior, or widget integration behavior, stop and report.

---

## Section B. Scope

This tranche contains exactly four behavior-preserving cleanup edits:

1. Remove two debug-only `console.info` calls.
2. Extract `clone` and `copyValues` from `state/reducerStateHelpers.js`.
3. Extract display-label sanitize support helpers from `view/applyDienststelleDisplaySanitizing.js`.
4. Keep everything else unchanged.

Allowed production files to modify:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/reconcileDienststelleHostScopes.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/reconcileConfirmedDienststelle.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/state/reducerStateHelpers.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/state/createDienststelleReducer.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/history/normalizeReplayTargetSnapshot.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/applyDienststelleDisplaySanitizing.js
```

Allowed new production files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/state/cloneJsonValue.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/state/copyDienststelleValueEntries.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/dienststelleDisplayLabelSanitizeSupport.js
```

No other files are in scope.

---

## Section C. Required edits

### C1. Remove debug-only `console.info` calls

Remove only these two `console.info` calls:

1. In `effects/reconcileDienststelleHostScopes.js`, inside `runUserConfirmAfterHostRead`, remove the diagnostic payload log for user-confirm reconcile mode.
2. In `effects/reconcileConfirmedDienststelle.js`, inside `scheduleVisualizationWidgetNotify`, remove the deferred widget notify string log.

Do not remove or change:

- any `console.error`;
- any `console.warn`;
- the `console.info("[dienststelle.visualizationWidget.dispatch]", payload)` fallback in `effects/notifyVisualizationWidgetDienststelleChanged.js`.

Acceptance:

- Reconcile/userConfirm flow is unchanged.
- Widget notify timing and dispatch behavior are unchanged.
- The contract-approved visualizationWidget fallback log remains.

### C2. Extract JSON clone helper

Create:

```txt
state/cloneJsonValue.js
```

Move the existing `clone` behavior from `state/reducerStateHelpers.js` into this file and export it as `clone`.

Rules:

- Preserve exact JSON clone behavior.
- Do not introduce structuredClone or any new `_KDB.utils` helper.
- Do not change clone behavior for `null`, `undefined`, arrays, or objects.

Acceptance:

- `createDienststelleReducer.js` still receives the same cloned state snapshots.
- `reducerStateHelpers.js` drops below 150 lines.

### C3. Extract Dienststelle value-copy helper

Create:

```txt
state/copyDienststelleValueEntries.js
```

Move `copyValues` and its private `copyValueEntry` behavior from `state/reducerStateHelpers.js` into this file.

Rules:

- Export `copyValues`.
- Keep `copyValueEntry` private unless the existing code requires otherwise.
- Preserve exact behavior:
  - non-array input returns `[]`;
  - each entry gets stringified `displayValue` and `useValue`;
  - `source` defaults to `"cognos"` when missing.

Update importers:

- `state/createDienststelleReducer.js`;
- `state/reducerStateHelpers.js`;
- `history/normalizeReplayTargetSnapshot.js`.

Acceptance:

- Reducer state changes produce identical value-entry shapes.
- History replay snapshot normalization produces identical value-entry shapes.
- No public selector/API behavior changes.

### C4. Extract display-label sanitize support

Create:

```txt
view/dienststelleDisplayLabelSanitizeSupport.js
```

Move only these helpers from `view/applyDienststelleDisplaySanitizing.js`:

- `shouldTransformLabel`;
- `resolveSanitizeSource`;
- `markLabelNodeReady`.

Rules:

- Do not extract `queryLabelTextNodes`.
- Do not extract `stripLabelElement`.
- Do not change query order, node deduplication, text/title/aria mutation behavior, or ready-class behavior.
- `markLabelNodeReady` must still apply the ready class in the same cases as before.
- `sanitizePopupLabelsInRoot` must still mark nodes ready even when no text strip occurs.
- `sanitizeCommittedDisplay` must preserve its existing `ariaFromSource: "ifEmpty"` behavior.

Acceptance:

- `applyDienststelleDisplaySanitizing.js` drops below 150 lines.
- Popup label sanitizing and committed display sanitizing remain behavior-identical by static inspection.

---

## Section D. Explicitly out of scope

The executing AI must not:

- Remove or change `console.info("[dienststelle.visualizationWidget.dispatch]", payload)` in `notifyVisualizationWidgetDienststelleChanged.js`.
- Add a debug flag or `_KDB.debug` path.
- Create `readActiveDienststelleSichtValue.js`.
- Create `toCognosFilterContextValues.js`.
- Change `applyDienststelleDefault.js`.
- Change `applyStoredDienststelleScopeValues.js`.
- Change `syncDienststelleFromSicht.js`.
- Change `runDienststelleReconcile.js`.
- Change selector placement or create `config/selectors.js`.
- Deduplicate `selectors.copySelectionValues` with reducer helpers.
- Rename `readDienststelleHostSelection.js`.
- Change `USER_COMMIT_DEFAULT_DELAY_MS` or `delayMs`.
- Change `stripLabelElement`, `queryLabelTextNodes`, label query order, `ariaFromSource`, or ready-marker semantics.
- Change action strings, state shape, runtime buckets, public API, history semantics, Cognos payload semantics, or widget downstream behavior.
- Touch contracts, rules, templates, legacy trees, `TEST/`, `filterDock`, `sicht`, `singleSelect`, `specialSingleSelect`, `KDB.js`, or `eventSubscribe.md`.

---

## Section E. Rules to apply

All touched/new files:

- `amd.mdc` — full-compact AMD modules, one `define`, no ES module syntax.
- `naming.mdc` — English technical identifiers; precise verb/noun file names.
- `feature-structure.mdc` — each file remains under 150 lines and has one focused responsibility.

State helpers:

- `state.mdc` — preserve owned state shape and clone/value-copy semantics.
- `module-public-api.mdc` — no public API or selector surface changes.

View helpers:

- `dom.mdc` — preserve scoped DOM mutation behavior; no live DOM refs in state.
- `runtime.mdc` — no runtime bucket changes.

Logging:

- `error-handling.mdc` — error/warn boundary logs remain; only approved debug `console.info` calls are removed.

---

## Section F. Acceptance criteria

AC1. Only files listed in Section B are changed or added.

AC2. The two approved debug `console.info` calls are removed, and the visualizationWidget fallback `console.info` remains unchanged.

AC3. `cloneJsonValue.js` preserves the prior `clone` behavior exactly.

AC4. `copyDienststelleValueEntries.js` preserves the prior `copyValues` behavior exactly.

AC5. `createDienststelleReducer.js`, `reducerStateHelpers.js`, and `normalizeReplayTargetSnapshot.js` still use the same clone/value-copy semantics by static inspection.

AC6. `dienststelleDisplayLabelSanitizeSupport.js` contains only `shouldTransformLabel`, `resolveSanitizeSource`, and `markLabelNodeReady`.

AC7. `applyDienststelleDisplaySanitizing.js` preserves query order, mutation targets, ready-class behavior, and committed-display `ariaFromSource` behavior.

AC8. `reducerStateHelpers.js` and `applyDienststelleDisplaySanitizing.js` are under 150 lines after the change.

AC9. No out-of-scope change from Section D occurred.

AC10. `ReadLints` is clean on all touched/new production files.

AC11. Static inspection confirms AMD import paths resolve and import counts stay within rule limits.

---

## Section G. Reviewer handoff

The executing AI final report must include:

1. Pre-flight echo for Section A.
2. File checklist with before/after line counts.
3. Exact removed `console.info` locations.
4. New helper files and exact moved functions.
5. Confirmation that no out-of-scope helpers/files were created.
6. AC1-AC11 pass/fail.
7. Lint result.
8. Any uncertainty or deviation.

