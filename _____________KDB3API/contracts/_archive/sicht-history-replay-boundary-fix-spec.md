# Fix Spec: `sicht` history replay boundary cleanup

> P0 ownership fix for `sicht` history replay.
> Current replay code imports `singleSelect` internals and writes `_KDB.state.filters.singleSelect` from inside `sicht`. That violates the approved `sicht` / `singleSelect` boundary and must be removed before broader cleanup.

---

**Status:** `Requires CP approval before execution`
**Date:** 2026-05-25
**Owner module:** `sicht`
**Base contracts:**

```txt
_____________KDB3API/contracts/sicht.md
_____________KDB3API/contracts/singleSelect.md
_____________KDB3API/contracts/sicht-singleSelect-boundary-fix-spec.md
```

This spec may change replay behavior. Do not execute it until the user explicitly approves the chosen replay route.

---

## Section A. Required Pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/events.mdc`
5. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
6. `_____________KDB3API/.cursor/rules/amd.mdc`
7. `_____________KDB3API/contracts/sicht.md`
8. `_____________KDB3API/contracts/singleSelect.md`
9. `_____________KDB3API/contracts/sicht-singleSelect-boundary-fix-spec.md`
10. `_____________KDB3API/contracts/sicht-history-replay-boundary-fix-spec.md`

---

## Section B. Scope

Allowed production files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/sicht/history/applySichtHistoryReplay.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/history/createSichtHistoryReplayHandler.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/config/actions.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/createSingleSelectController.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/replayCommittedSelection.js
```

Allowed contract sync:

```txt
_____________KDB3API/contracts/sicht.md
_____________KDB3API/contracts/singleSelect.md
```

If a clean implementation needs any other file, stop and report before editing it.

---

## Section C. Problem

Current blocker:

```js
// sicht/history/applySichtHistoryReplay.js
"../../../singleSelect/effects/commitSelectionState.js"
"../../../singleSelect/state/selectionState.js"

_commitSelectionState.applyConfirmedState(
  filterState,
  singleSelectRoot,
  _selectionState.createConfirmedSelection(...)
);
```

Why this is forbidden:

- `sicht` imports `singleSelect` internal `effects/` and `state/` files.
- `sicht` reads and writes `_KDB.state.filters.singleSelect`.
- Replay creates a parallel state-sync path beside the approved `filterDock -> sicht -> singleSelect` delegation model.
- `sicht.md` says replay in this tranche restores only the Sicht owner state and dependent replay is deferred until owner APIs exist.

Allowed `sicht` replay responsibilities:

- validate a `filter_sicht` history step;
- resolve the target Sicht `{ displayValue, useValue }`;
- commit the Cognos Sicht filter through the documented replay/startup exception;
- update `_KDB.state.filters.sicht` through `_KDB.api.sicht.dispatch(...)`;
- optionally request `singleSelect` replay sync through a public `singleSelect` action if CP approves that contract delta.

Forbidden `sicht` replay responsibilities:

- importing any `singleSelect/state/`, `singleSelect/effects/`, `singleSelect/history/`, or `singleSelect/runtime/` file;
- writing `_KDB.state.filters.singleSelect`;
- reading `_KDB.runtime.singleSelect`;
- mutating `specialSingleSelect` or Dienststelle state;
- adding events.

---

## Section D. Required Decision Before Execution

Choose exactly one route before implementation:

### Option A - Pure boundary cleanup, no `singleSelect` replay sync

`sicht` replay updates Cognos and Sicht owner state only. It removes the foreign `singleSelect` sync entirely.

Trade-off:

- Safest ownership fix.
- On the next Sicht popup open, `singleSelect` must hydrate through existing public flow.
- If the popup is already open during replay, its transient `singleSelect` view may not refresh immediately.

### Option B - Add public `singleSelect` replay action

Add a narrow dispatch action to `singleSelect`, for example:

```txt
singleSelect/sichtHistoryReplayCommitted
```

`sicht` calls:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/sichtHistoryReplayCommitted",
  payload: {
    filterType: "sicht",
    filterScope: "global",
    filterLabel: "Sicht",
    selection: { displayValue: "...", useValue: "..." },
    observedAt: 0
  }
});
```

`singleSelect` owns any update to `_KDB.state.filters.singleSelect`.

Trade-off:

- Preserves immediate replay sync for the delegated `singleSelect` state.
- Requires a small `singleSelect` contract delta and implementation change.
- Still no internal imports and no foreign write from `sicht`.

Recommendation: **Option B**, because current behavior already attempts to keep delegated `singleSelect` state aligned during replay. The replacement should preserve that behavior through a public owner API.

---

## Section E. Required Fix

### E1. Remove `singleSelect` internal imports from `sicht`

File:

```txt
KDB3/js/dashboard/filters/sicht/history/applySichtHistoryReplay.js
```

Required changes:

- Delete imports of:
  - `../../../singleSelect/effects/commitSelectionState.js`
  - `../../../singleSelect/state/selectionState.js`
- Delete the direct `syncSingleSelectSichtState` implementation that reads or writes `_KDB.state.filters.singleSelect`.
- Keep Cognos replay and `_KDB.api.sicht.dispatch({ type: "sicht/singleSelectCommitted", ... })`.

### E2. If CP chooses Option B, add public singleSelect replay action

Files:

```txt
KDB3/js/dashboard/filters/singleSelect/config/actions.js
KDB3/js/dashboard/filters/singleSelect/createSingleSelectController.js
KDB3/js/dashboard/filters/singleSelect/effects/replayCommittedSelection.js
```

Required behavior:

- Add one action constant for the owner API route.
- `singleSelect` handles the action through its own controller / effect path.
- It may update only `_KDB.state.filters.singleSelect`.
- It must be gated to `payload.filterType === "sicht"` and `filterLabel === "Sicht"`.
- It must normalize selection using existing `singleSelect` owner helpers from inside `singleSelect`.
- It must not call `_KDB.api.sicht` back.
- It must not push generic `filter_singleSelect` history for `filterType: "sicht"`.

### E3. If CP chooses Option A, do not touch `singleSelect`

Required behavior:

- `applySichtHistoryReplay.js` removes the foreign sync and does not replace it.
- Report explicitly that delegated `singleSelect` state is expected to refresh only through the existing open/handoff hydration flow.

### E4. Contract sync

Files:

```txt
contracts/sicht.md
contracts/singleSelect.md
```

Required updates:

- `sicht.md`: replay may not import or write `singleSelect`; dependent replay sync is either removed or routed through public `singleSelect` dispatch.
- `singleSelect.md`: only if Option B is chosen, document the new replay action and its payload.
- Do not add events or event catalog entries.

---

## Section F. Boundaries To Preserve

Do not:

- modify `filterDock/`;
- modify CSS;
- modify `KDB.js`;
- modify `filterPropId.js` or saved properties;
- modify legacy trees or `TEST/`;
- add events or edit `eventSubscribe.md`;
- add Dienststelle / hierarchy behavior;
- import `singleSelect` internals from `sicht`;
- import `sicht` internals from `singleSelect`;
- write `_KDB.state.filters.singleSelect` from `sicht`;
- write `_KDB.state.filters.specialSingleSelect`;
- read `_KDB.runtime.filterDock`;
- rename or move history folders in this tranche.

Folder consolidation is a separate cleanup tranche and must not be bundled with this P0 boundary fix.

---

## Section G. Verification

Static verification:

1. `ReadLints` on touched files.
2. No `singleSelect/` import path under `KDB3/js/dashboard/filters/sicht/`.
3. No `_KDB.state.filters.singleSelect` reference under `KDB3/js/dashboard/filters/sicht/`.
4. No `_KDB.runtime.singleSelect` or `_KDB.runtime.filterDock` reference under `sicht/`.
5. `applySichtHistoryReplay.js` still returns `false` for non-`filter_sicht` steps.
6. `applySichtHistoryReplay.js` still commits Cognos Sicht context when a valid target exists.
7. `applySichtHistoryReplay.js` still dispatches `sicht/singleSelectCommitted` with `isHistoryReplay: true`.
8. If Option B is chosen, `singleSelect` action handling is gated to `filterType: "sicht"` and does not push generic singleSelect history.
9. All touched JS files are <=150 lines.
10. No events, CSS, `filterDock`, `KDB.js`, saved properties, legacy files, or `TEST/` files changed.

Manual smoke:

1. Reload dashboard.
2. Manually change Sicht and confirm the normal user flow still commits.
3. Confirm `filter_sicht` history step is still pushed for manual Sicht commit.
4. Trigger history replay for a Sicht step.
5. Cognos Sicht filter changes to the replay target.
6. `_KDB.state.filters.sicht.currentSelection` matches the replay target.
7. If Option B is chosen, delegated `singleSelect.byScope.global.Sicht` matches the replay target after replay.
8. `specialSingleSelect/sichtChanged` behavior remains unchanged from before this tranche.
9. No Dienststelle dispatch is expected.

---

## Section H. Reporting Template

Executing AI must report:

1. Pre-flight echo.
2. CP-approved route: Option A or Option B.
3. Files modified with final line counts.
4. Exact removed `singleSelect` internal imports from `sicht`.
5. Exact removed foreign state read/write from `sicht`.
6. Replay behavior before/after.
7. Contract sync summary.
8. Static verification results.
9. Manual smoke steps still required.
10. Deviations or blockers.

---

## Executing-AI Prompt

```text
You are the executing AI for `sicht` history replay boundary cleanup.

Project root:
c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05

Read first:
1. _____________KDB3API/contracts/sicht-history-replay-boundary-fix-spec.md
2. All Section A files from that spec.

Echo one sentence per file/rule before editing.

Do not start unless the user has explicitly approved Option A or Option B from Section D.

Core goal:
- Remove all `singleSelect` internal imports and foreign `_KDB.state.filters.singleSelect` writes from `sicht`.
- Preserve or deliberately narrow history replay behavior only through approved public APIs.

Hard constraints:
- Do not modify filterDock.
- Do not modify CSS.
- Do not modify KDB.js.
- Do not modify filterPropId or savedProperties.
- Do not modify legacy trees or TEST.
- Do not add events.
- Do not add Dienststelle/hierarchy behavior.
- Do not import singleSelect internals from Sicht.
- Do not import Sicht internals from singleSelect.
- Do not rename/move history folders in this tranche.
- Keep touched JS files <=150 lines.

After edits:
- Run lints on touched files.
- Run static checks from Section G.
- Report using Section H.
```
