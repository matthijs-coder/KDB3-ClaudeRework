# Fix Spec: `singleSelect` F6 native-click removal trial

> CP-gated behavior trial for removing commit-only native Cognos option clicks from `singleSelect`.
> The strict post-commit `verifyCommitFilterValue` safety check stays enabled in this tranche so regressions are attributable and rollback behavior remains visible.

---

**Status:** `Executed — accepted baseline (smoke passed 2026-05-26)`
**Date:** 2026-05-26
**Owner module:** `singleSelect`
**Base contracts:**

```txt
_____________KDB3API/contracts/singleSelect.md
_____________KDB3API/contracts/singleSelect-tableLookup-streamline-fix-spec.md
```

This spec removed commit-path native Cognos option clicks. Manual Cognos smoke passed; the change is the accepted production baseline. Strict `verifyCommitFilterValue` remains active; verify-downgrade is a separate future CP decision.

---

## Section A. Required Pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/dom.mdc`
5. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/amd.mdc`
8. `_____________KDB3API/contracts/singleSelect.md`
9. `_____________KDB3API/contracts/singleSelect-tableLookup-streamline-fix-spec.md`
10. `_____________KDB3API/contracts/singleSelect-f6-native-click-removal-fix-spec.md`

---

## Section B. Scope

Allowed production files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/syncNativePopupToPending.js
```

Allowed contract sync:

```txt
_____________KDB3API/contracts/singleSelect.md
```

Delete `syncNativePopupToPending.js` only if it has zero remaining imports after the commit path is updated. If deleting the file is awkward in the environment, leave it unused and report it as obsolete.

If a clean implementation needs any other file, stop and report before editing it.

---

## Section C. Problem

Current commit flow still primes Cognos native popup selection before calling `replaceFilterContext`:

```js
_syncNativePopupToPending.syncNativePopupToPending(popupMount, nextSelectionLabel, {
  resetViaAlle: nextSelectionLabel !== "Alle" &&
    _commitSelectionState.isFromAlleBackup(_filterState, nextSelectionLabel)
});
_syncPopupOptionSelection(popupMount, _filterState);
```

This is legacy/F6 carry-over. The current canonical commit source is tableData / owner-provided values followed by:

```txt
replaceFilterContext(filterApi, values)
verifyCommitFilterValue(filterApi, nextSelectionLabel)
applyConfirmedState(...)
```

The native click path may be redundant because `replaceFilterContext` receives explicit `{ d, u }` values and `syncPopupOptionSelection` already owns the visual popup sync.

Highest-risk edge case:

```txt
Alle -> concrete member
```

Legacy used a native Alle reset before clicking the target member. This tranche deliberately tests whether explicit `replaceFilterContext` plus strict verify is sufficient without native clicks.

---

## Section D. CP Decision

Approved route for this spec:

```txt
Remove commit-only native option clicks.
Keep strict verifyCommitFilterValue unchanged.
Keep syncPopupOptionSelection before replaceFilterContext.
```

Rationale:

- If Cognos needs native popup clicks, strict verify should fail before state/history are committed.
- Keeping verify strict isolates this tranche from the separate verify-downgrade decision.
- Visual popup state still updates through `syncPopupOptionSelection`.

This tranche does not decide whether `verifyCommitFilterValue` should later become warn-only or Alle-only. That is a separate CP decision.

---

## Section E. Required Fix

### E1. Remove native-click call from commit path

File:

```txt
KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
```

Required behavior:

- Remove the import of `./syncNativePopupToPending.js`.
- Remove the call to `_syncNativePopupToPending.syncNativePopupToPending(...)`.
- Keep `_syncPopupOptionSelection(popupMount, _filterState)` in the same pre-commit location when `popupMount` exists.
- Keep `replaceFilterContext`, strict `verifyCommitFilterValue`, `applyConfirmedState`, owner notification, history push, success-only popup close, rollback, and `finally` commit UI reset unchanged.

Commit order after this tranche:

1. Resolve filter API.
2. If `popupMount` exists, sync popup option classes from pending state.
3. Replace Cognos filter context (`[]` for Alle, `[selectedValue]` for non-Alle).
4. Strictly verify committed Cognos value through `verifyCommitFilterValue`.
5. Apply confirmed `singleSelect` state.
6. Notify owning module for `sicht` / `specialSingleSelect` where applicable.
7. Push generic `filter_singleSelect` history except for `filterType: "sicht"`.
8. Close popup only after success.
9. Reset `isCommitInProgress` and commit UI in `finally`.

### E2. Remove or obsolete the native-click helper

File:

```txt
KDB3/js/dashboard/filters/singleSelect/effects/syncNativePopupToPending.js
```

Required behavior:

- If no imports remain, delete the file.
- If deletion is not possible, leave it unused and report it as obsolete.
- Do not move any of its native click logic into another file.
- Do not create a replacement native click helper.

### E3. Optional contract sync

File:

```txt
contracts/singleSelect.md
```

Update only if the contract still says commit requires native popup option clicks. The contract may say:

- visual popup state is synced through `syncPopupOptionSelection`;
- committed Cognos value is applied through `replaceFilterContext`;
- post-commit mirror safety remains `verifyCommitFilterValue`.

Do not change public API, action names, events, history scope, or `filterType: "sicht"` delegation.

---

## Section F. Boundaries To Preserve

Do not:

- modify `sicht/`;
- modify `filterDock/`;
- modify CSS;
- modify `KDB.js`;
- modify `filterPropId.js` or saved properties;
- modify legacy trees or `TEST/`;
- add events or edit `eventSubscribe.md`;
- add Dienststelle / hierarchy behavior;
- change `verifyCommitFilterValue` behavior;
- remove rollback on failed verify;
- change tableData lookup or `selectionValuesByDisplay`;
- change owner notification or history behavior;
- simplify `guardInteractionFreshness`;
- change selector config or DOM query policy in this tranche;
- add production debug logs.

---

## Section G. Verification

Static verification:

1. `ReadLints` on touched files.
2. No import of `syncNativePopupToPending.js` remains.
3. No `syncNativePopupToPending` symbol remains under `singleSelect/`, unless the file is intentionally left obsolete and no caller imports it.
4. `commitConfirmedSelection.js` still imports and calls `syncPopupOptionSelection`.
5. `commitConfirmedSelection.js` still imports and calls `verifyCommitFilterValue`.
6. `verifyCommitFilterValue.js` is unchanged.
7. No new native `.click()` helper is introduced.
8. No new `console.log`.
9. All touched JS files are <=150 lines.
10. No `sicht/`, `filterDock/`, CSS, `KDB.js`, saved properties, legacy, `TEST/`, or events files changed.

Manual Cognos smoke:

1. Reload dashboard.
2. Normal singleSelect: `Alle -> first concrete option -> OK`.
3. Normal singleSelect: concrete option A -> concrete option B -> OK.
4. Normal singleSelect: concrete option -> `Alle -> OK`.
5. Rapid A/B toggle then OK: latest pending selection commits.
6. Reopen popup after commit: `.KDB_selectedOption` is on the committed row and no ghost selections remain.
7. Sicht delegated commit still works and still skips generic `filter_singleSelect` history.
8. Failed verify path still rolls back and resets commit UI.
9. No new console errors/warnings.

If any Alle-to-member or member-to-Alle smoke fails, revert this tranche and keep `syncNativePopupToPending` until a narrower Cognos host explanation exists.

**Outcome:** All manual smoke cases passed (2026-05-26). No revert. `syncNativePopupToPending.js` deleted; commit baseline uses `syncPopupOptionSelection` + `replaceFilterContext` + strict `verifyCommitFilterValue`.

---

## Section H. Reporting Template

Executing AI must report:

1. Pre-flight echo.
2. Files modified/deleted/left obsolete with line counts.
3. Exact removed import/call from `commitConfirmedSelection.js`.
4. Confirmation `syncPopupOptionSelection` remains before `replaceFilterContext`.
5. Confirmation strict `verifyCommitFilterValue` remains unchanged.
6. Confirmation owner notification and history behavior are unchanged.
7. Static verification results.
8. Manual smoke status or `not run`.
9. Deviations or blockers.

---

## Executing-AI Prompt

```text
You are the executing AI for `singleSelect` F6 native-click removal trial.

Project root:
c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05

Read first:
1. _____________KDB3API/contracts/singleSelect-f6-native-click-removal-fix-spec.md
2. All Section A files from that spec.

Echo one sentence per file/rule before editing.

Do not start unless the user has explicitly approved this CP decision:
Remove commit-only native option clicks, keep strict verifyCommitFilterValue unchanged.

Implement only this spec.

Core goals:
- Remove the commit-path dependency on `syncNativePopupToPending`.
- Keep visual popup sync via `syncPopupOptionSelection`.
- Keep strict post-commit `verifyCommitFilterValue` unchanged.
- Preserve rollback, owner notification, history, Sicht delegation, public API, and action names.

Hard constraints:
- Do not modify sicht.
- Do not modify filterDock.
- Do not modify CSS.
- Do not modify KDB.js.
- Do not modify filterPropId or savedProperties.
- Do not modify legacy trees or TEST.
- Do not add events.
- Do not add Dienststelle/hierarchy behavior.
- Do not change verifyCommitFilterValue behavior.
- Do not simplify guardInteractionFreshness.
- Do not add native click replacement logic.
- Keep touched JS files <=150 lines.

After edits:
- Run lints on touched files.
- Run static checks from Section G.
- Report using Section H.
```

---

## Execution Log

| Date | Outcome | Notes |
|---|---|---|
| 2026-05-26 | Accepted baseline | `commitConfirmedSelection.js` updated; `syncNativePopupToPending.js` deleted. Manual Cognos smoke all green. Strict `verifyCommitFilterValue` unchanged. Docs sync tranche updated related contracts. |
