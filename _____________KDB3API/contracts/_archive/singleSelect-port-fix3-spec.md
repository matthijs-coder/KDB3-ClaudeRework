# Fix Spec: `singleSelect` CP-2 Review Iteration 3

> Final split-only fix-spec for the remaining file-size violation in `commitConfirmedSelection.js`.
> No behavior changes. No scope widening.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/singleSelect.md`
**Base execution spec:** `_____________KDB3API/contracts/singleSelect-port-execution-spec.md`
**Prior fix specs:** `singleSelect-port-fix-spec.md`, `singleSelect-port-fix2-spec.md`
**Reviewer:** GPT-5.5, 2026-05-22

---

## Section A. Mandatory read list

Read these before editing and echo one sentence per item:

1. `_____________KDB3API/contracts/singleSelect.md`
2. `_____________KDB3API/contracts/singleSelect-port-execution-spec.md`
3. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
4. `_____________KDB3API/.cursor/rules/amd.mdc`
5. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
6. `_____________KDB3API/.cursor/rules/state.mdc`
7. `_____________KDB3API/.cursor/rules/runtime.mdc`
8. `_____________KDB3API/.cursor/rules/naming.mdc`

---

## Section B. Allowed edit/create scope

You may edit:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
```

You may create focused helper files only under:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/
```

Allowed new helper file names:

```txt
createConfirmedSelectionFromValue.js
restorePreviousConfirmedSelection.js
```

Do not create any other files.

---

## Section C. Required split

### Problem

`effects/commitConfirmedSelection.js` is 161 lines, exceeding the 150-line hard limit in `feature-structure.mdc` and the execution spec.

### Required fix

Split without changing behavior:

1. Move confirmed-selection conversion helpers into:

```txt
effects/createConfirmedSelectionFromValue.js
```

This helper should:

- import `../state/selectionState.js` and `./resolveFilterApi.js`;
- preserve `getUseFromValue`;
- return a confirmed selection from a Cognos value object exactly as the current `commitConfirmedSelection.js` does.

2. Move rollback Cognos restore into:

```txt
effects/restorePreviousConfirmedSelection.js
```

This helper should:

- import `../state/selectionState.js`;
- preserve current behavior:
  - use `_KDB.cognosAPI.filters.replaceFilterContext`;
  - build `[]` for `"Alle"` / empty use value;
  - build `[ { u, d } ]` for non-Alle;
  - swallow only rollback cleanup failures with a comment.

3. Update `commitConfirmedSelection.js` to import and use both helpers.

4. Keep `commitConfirmedSelection.js` behavior identical:

- set `isCommitInProgress = true` before Cognos work;
- set programmatic click guard around optional `clickOriginalButton`;
- commit `"Alle"` as `replaceFilterContext(filterApi, [])`;
- poll matching/normalized values as before;
- update current/backup/pending state on success;
- push history through `_KDB.services.history.pushCommittedStep` when available;
- rollback state and Cognos on failure;
- clear commit UI and optional closePopup in `finally`.

5. All touched/created files must be under 150 lines.

---

## Section D. Forbidden actions

Do not:

- modify any file outside the allowed scope;
- modify filterDock;
- modify KDB.js;
- modify eventSubscribe.md;
- create events/eventNames.js;
- create specialRights/;
- create singleSelectHistoryAdapter.js;
- modify collectReplayHandlers.js;
- modify contracts/rules/templates;
- read or write `_KDB.runtime.filterDock`;
- add dock-level listeners or dock observers;
- change behavior beyond the split.

---

## Section E. Verification

After edits:

1. Run lints on:
   - `commitConfirmedSelection.js`
   - `createConfirmedSelectionFromValue.js`
   - `restorePreviousConfirmedSelection.js`
2. Confirm all touched/created files are under 150 lines.
3. Confirm no forbidden files changed.
4. Confirm behavior-preservation for success, failure rollback, history push, and finally cleanup.
5. Report:
   - pre-flight echo;
   - files changed/created with line counts;
   - behavior-preservation summary;
   - lint result;
   - forbidden-scope confirmation;
   - any blocker.
