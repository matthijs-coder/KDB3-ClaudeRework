# Fix Spec: `sicht` popupReady parity with `singleSelect`

> Focused P0 fix tranche for the first-reopen-after-OK visual sync issue in `sicht`.
> Apply the existing `singleSelect` / `specialSingleSelect` F7 popupReady session and bounded resync mechanics to `sicht`. Do not invent a new Sicht-specific popup restore architecture.

---

**Status:** `Ready for execution`
**Date:** 2026-05-25
**Base contract:** `_____________KDB3API/contracts/sicht.md`
**Related specs:**

```txt
_____________KDB3API/contracts/singleSelect-tableLookup-streamline-fix-spec.md
_____________KDB3API/contracts/singleSelect-F7-popupReady-session-reset-communique.md
_____________KDB3API/contracts/singleSelect-visual-close-fix-spec.md
_____________KDB3API/contracts/sicht-port-fix-spec-4.md
```

---

## Section A. Required pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/events.mdc`
5. `_____________KDB3API/.cursor/rules/dom.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/contracts/sicht.md`
8. `_____________KDB3API/contracts/singleSelect-F7-popupReady-session-reset-communique.md`
9. `_____________KDB3API/contracts/singleSelect-tableLookup-streamline-fix-spec.md`
10. This fix spec.

---

## Section B. Scope

Only modify these filterDock observation/click files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/popupReadyFilterMatch.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/managePopupReadyTransition.js
```

Read-only verification may inspect:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/bindDockClickListener.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/decidePostReadyResync.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/dispatchPopupReadyHandoff.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/effects/handleSichtFilterDockHandoff.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/effects/syncSichtOptionAvailability.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/runSingleSelectInteraction.js
```

If execution discovers another file must change, stop and report before editing it.

---

## Section C. Problem

The F7 popupReady reset/resync solution is currently applied to:

```txt
singleSelect
specialSingleSelect
```

but not to:

```txt
sicht
```

Current code evidence:

```js
// filterDock/observation/popupReadyFilterMatch.js
function isSingleSelectFamily(_lastClickedFilter) {
  var filterType = _lastClickedFilter && _lastClickedFilter.filterType;
  return filterType === "singleSelect" || filterType === "specialSingleSelect";
}
```

```js
// filterDock/observation/managePopupReadyTransition.js
function isSingleSelectFamilyFilterType(_filterType) {
  return _filterType === "singleSelect" || _filterType === "specialSingleSelect";
}
```

This excludes `sicht` from:

- bounded post-ready popupReady follow-up dispatch in `decidePostReadyResync`;
- popupReady session reset on lifecycle clicks via `resetSessionOnSingleSelectClick`.

Expected symptom: after a successful Sicht OK commit, the first popup reopen can miss `.KDB_selectedOption`; the second reopen works after closed/empty observer reset.

---

## Section D. Required Fix

### D1. Include `sicht` in the filterDock singleSelect-family predicate

File:

```txt
KDB3/js/dashboard/filters/filterDock/observation/popupReadyFilterMatch.js
```

Required change:

- Extend `isSingleSelectFamily(_lastClickedFilter)` so `filterType === "sicht"` returns `true`.
- Preserve existing behavior for `singleSelect` and `specialSingleSelect`.
- Do not add Sicht-specific branch logic beyond family membership.

Acceptance:

- `decidePostReadyResync.js` no longer returns `notSingleSelectFamily` for a Sicht popup.
- At most one post-ready follow-up popupReady remains allowed per open cycle.

### D2. Reset popupReady session on Sicht lifecycle clicks

File:

```txt
KDB3/js/dashboard/filters/filterDock/observation/managePopupReadyTransition.js
```

Required change:

- Extend `isSingleSelectFamilyFilterType(_filterType)` so `filterType === "sicht"` returns `true`.
- Keep reset triggers unchanged:
  - `open`
  - `confirm`
  - `cancel`
  - `close`
- Do not add new timers, observers, or retry loops.

Acceptance:

- `resetSessionOnSingleSelectClick()` resets session for Sicht open / confirm / cancel / close.
- Existing `singleSelect` and `specialSingleSelect` reset behavior is unchanged.

---

## Section E. Boundaries To Preserve

Do not:

- modify files under `sicht/`;
- add a MutationObserver, timer, `requestAnimationFrame`, or retry loop in `sicht/` or `singleSelect/`;
- copy REDESIGN2 `restorePopupSelection` into `sicht/`;
- change commit, history, tableData, default startup, Dienststelle, or specialSingleSelect dispatch behavior;
- add events or edit `eventSubscribe.md`;
- modify `.cursor/rules/`, contract templates, legacy trees, `TEST/`, CSS, `KDB.js`, or `filterPropId.js`;
- introduce `filterDock/applySichtPopupAvailabilityRequested`;
- put `BW`, `DEZPV`, `byOption`, or Sicht option DOM semantics under `filterDock/`.

Keep the intended flow:

```txt
filterDock observes/routes popup facts
  -> _KDB.api.sicht.dispatch(...)
  -> sicht evaluates/syncs Sicht availability
  -> sicht delegates sync-only popupReady to singleSelect
  -> singleSelect restorePopupSelection/syncPopupOptionSelection applies .KDB_selectedOption
```

---

## Section F. Verification

After edits:

1. Run `ReadLints` on the two touched files.
2. Verify no file under `sicht/` was modified.
3. Static checks:
   - `popupReadyFilterMatch.isSingleSelectFamily` accepts `sicht`.
   - `managePopupReadyTransition.isSingleSelectFamilyFilterType` accepts `sicht`.
   - no `filterDock/applySichtPopupAvailabilityRequested` exists.
   - no new `kdb-sicht-*` production class names exist.
   - no `_KDB.runtime.filterDock` read exists under `sicht/`.
4. Manual Cognos smoke:
   - Sicht select `BW` or `DEZPV` -> OK commit succeeds.
   - First popup reopen shows committed option wrapper with `.KDB_selectedOption`.
   - Console trace, when enabled, shows session reset on Sicht open and confirm/close.
   - Max initial popupReady plus one follow-up popupReady per open cycle; no popupReady flood.
   - `specialSingleSelect/sichtChanged` remains visible after successful confirmed commit when `specialSingleSelect` is mounted.

---

## Section G. Out Of Scope

These are known follow-up topics and must not be mixed into this P0 tranche:

- default Sicht startup commit / `applyStartupSicht`;
- Dienststelle / hierarchy dispatch or state;
- removing or refactoring `filterDock/compat`;
- changing `filterPropId.js` / saved properties;
- changing Sicht tableData semantics;
- changing CSS class alignment.

---

## Section H. Reporting Template

Executing AI must report:

1. Pre-flight echo for Section A.
2. Files modified with final line counts.
3. Confirmation for D1 and D2.
4. Verification result for Section F.
5. Any deviation or blocker.

---

## Executing-AI Prompt

```text
You are the executing AI for `sicht` popupReady parity with the existing `singleSelect` F7 filterDock mechanics.

Project root:
c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05

Read first:
1. _____________KDB3API/contracts/sicht-popupReady-parity-fix-spec.md
2. All Section A files from that spec.

Echo one sentence per file/rule before editing.

Implement only Section D:
- Include `sicht` in `filterDock/observation/popupReadyFilterMatch.js` singleSelect-family matching.
- Include `sicht` in `filterDock/observation/managePopupReadyTransition.js` reset-session family matching.

Do not modify `sicht/`, `singleSelect/`, CSS, KDB.js, filterPropId, TEST, legacy trees, events, rules, or contracts.
Do not add observers, timers, requestAnimationFrame, or retry loops.
Do not add Dienststelle/default startup behavior.

After edits, run lints on touched files and report Section H.
```
