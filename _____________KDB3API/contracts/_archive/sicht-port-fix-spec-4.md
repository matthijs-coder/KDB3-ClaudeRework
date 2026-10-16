# Fix Spec 4: rollback wrong `filterDock` DOM ownership for `sicht`

> Focused fix iteration after investigation found `sicht-port-fix-spec-3.md` moved Sicht-specific semantics into `filterDock`.
> This spec deliberately rolls back the architecture mistake from fix spec 3.

---

**Status:** `Ready for execution`
**Base contract:** `_____________KDB3API/contracts/sicht.md`
**Base execution spec:** `_____________KDB3API/contracts/sicht-port-execution-spec.md`
**Prior fix specs:**

```txt
_____________KDB3API/contracts/sicht-port-fix-spec-1.md
_____________KDB3API/contracts/sicht-port-fix-spec-2.md
_____________KDB3API/contracts/sicht-port-fix-spec-3.md
```

**Finding:** Fix spec 3 is architecturally wrong. `filterDock` must observe and route filter/popup facts; it must not own Sicht-specific option semantics, Sicht classes, `BW` / `DEZPV` logic, `Alle` hiding, or `byOption` interpretation. Sicht owns Sicht popup behavior.

---

## Section A. Required pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
2. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
3. `_____________KDB3API/.cursor/rules/state.mdc`
4. `_____________KDB3API/.cursor/rules/runtime.mdc`
5. `_____________KDB3API/.cursor/rules/dom.mdc`
6. `_____________KDB3API/.cursor/rules/amd.mdc`
7. `_____________KDB3API/contracts/filterDock.md`
8. `_____________KDB3API/contracts/sicht.md`
9. `_____________KDB3API/contracts/sicht-port-fix-spec-2.md`
10. `_____________KDB3API/contracts/sicht-port-fix-spec-3.md`
11. This fix spec.

---

## Section B. Files allowed to modify

Only modify, create or delete files under:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/
_____________KDB3API/KDB3/js/dashboard/filters/sicht/
```

If another file appears necessary, stop and report before editing it.

---

## Section C. Required rollback of fix spec 3

### C1. Remove Sicht-specific action and effect from `filterDock`

Files:

```txt
KDB3/js/dashboard/filters/filterDock/config/actions.js
KDB3/js/dashboard/filters/filterDock/effects/dispatchFilterDockDomAction.js
KDB3/js/dashboard/filters/filterDock/createFilterDockController.js
KDB3/js/dashboard/filters/filterDock/effects/applySichtPopupAvailability.js
```

Required change:

- Delete `filterDock/effects/applySichtPopupAvailability.js`.
- Remove action constant:

```js
APPLY_SICHT_POPUP_AVAILABILITY_REQUESTED
```

- Remove imports/routes for `applySichtPopupAvailability.js`.
- Remove any `filterDock/applySichtPopupAvailabilityRequested` DOM-action branch.
- Keep existing generic filterDock DOM actions such as click original button / close active popup.
- Keep `filterDock` routing to `_KDB.api.sicht` from prior specs.

Acceptance:

- No `applySichtPopupAvailability.js` file remains.
- No `APPLY_SICHT_POPUP_AVAILABILITY_REQUESTED` constant remains.
- No hardcoded `BW`, `DEZPV`, `Alle`, `byOption`, or `kdb-sicht-*` remains under `dashboard/filters/filterDock/`, except generic `filterType: "sicht"` routing/classification.

Rules to apply:

- `filterDock.md` - filterDock observes and routes; it does not own Sicht logic.
- `module-public-api.mdc` - no wrong-owner public command surface.
- `state.mdc` - no foreign state writes.

### C2. Restore Sicht-owned popup availability files

Create or restore under `sicht/effects/`:

```txt
resolveSichtPopupMount.js
readSichtOptionLabel.js
hideDuplicateSichtOptions.js
applySichtOptionState.js
syncSichtOptionAvailability.js
```

Responsibilities:

- `resolveSichtPopupMount.js`
  - Resolves the currently relevant popup mount for Sicht owner behavior.
  - Allowed lookup order:
    1. `_KDB.runtime.sicht.domRefs.popupMount` if attached.
    2. Sicht-owned cached `filterEl` under `_KDB.runtime.sicht.domRefs` if attached.
    3. Scoped lookup from filterDock selector strings using serializable handoff fields (`filterKey`, `filterLabel`, `filterScope`), but never reading `_KDB.runtime.filterDock`.
    4. Bounded fallback to the known Cognos popup mount selector only as a documented Sicht DOM exception:

```js
".wa-filterDock-filterItemMount"
```

  - The fallback is allowed because Cognos popup DOM is host-owned and not serializable in the handoff; it must be used only during Sicht popup-ready / visible-popup handling.
  - Store live nodes only in `_KDB.runtime.sicht.domRefs`.

- `readSichtOptionLabel.js`
  - Reads labels from option nodes using `sicht/config/selectors.js`.
  - No state writes.

- `hideDuplicateSichtOptions.js`
  - Hides duplicate options, keeping the selected option where possible.
  - No state writes.

- `applySichtOptionState.js`
  - Owns Sicht option DOM semantics:
    - hide `Alle`;
    - hide invisible options;
    - disable visible but not-ready options;
    - apply `kdb-sicht-*` classes from Sicht config/selectors;
    - keep current selected option visible.
  - No foreign state writes.

- `syncSichtOptionAvailability.js`
  - Orchestrates the above helpers.
  - Returns real `{ didSync, visibleCount, enabledCount }`.
  - Must be <=150 lines.

Acceptance:

- Sicht-specific values/classes (`BW`, `DEZPV`, `Alle`, `kdb-sicht-*`, `byOption`) exist only under `dashboard/filters/sicht/`, not under `filterDock/`.
- No file under `sicht/` reads `_KDB.runtime.filterDock`.
- Live DOM refs are stored only under `_KDB.runtime.sicht.domRefs`.
- Every created/restored file is <=150 lines.

Rules to apply:

- `dom.mdc` - Sicht owns its own popup behavior; scoped DOM query and explicit exception only.
- `runtime.mdc` - live refs under `_KDB.runtime.sicht`.
- `feature-structure.mdc` - focused files, line limits.
- `amd.mdc` - one AMD module per file.

### C3. Restore `sicht` local sync call

Files:

```txt
KDB3/js/dashboard/filters/sicht/effects/handleSichtFilterDockHandoff.js
KDB3/js/dashboard/filters/sicht/effects/syncSichtOptionAvailability.js
```

Required change:

- `handleSichtFilterDockHandoff.js` must call local `_syncSichtOptionAvailability(...)` for popup-ready or visible-popup handoffs.
- It must not dispatch `filterDock/applySichtPopupAvailabilityRequested`.
- `syncSichtOptionAvailability.js` must perform Sicht-owned DOM sync and return real counts.
- Delegation to `_KDB.api.singleSelect` remains unchanged.

Acceptance:

- The intended flow is:

```txt
filterDock observes/routes
  -> _KDB.api.sicht.dispatch(...)
  -> sicht evaluates byOption
  -> sicht syncs its own popup availability
  -> sicht delegates generic commit behavior to singleSelect
```

- No reverse `sicht -> filterDock` DOM command remains.

Rules to apply:

- `module-public-api.mdc` - use public APIs only where crossing owners.
- `events.mdc` - no event added.
- `dom.mdc` - owner-specific DOM behavior stays in Sicht.

### C4. Preserve good fixes from fix specs 1 and 2

Do not regress these:

- `singleSelect/effects/runSingleSelectInteraction.js` accepts `filterType: "sicht"`.
- `singleSelect/effects/commitConfirmedSelection.js` skips generic singleSelect history for `filterType: "sicht"`.
- `singleSelect/effects/commitConfirmedSelection.js` notifies `_KDB.api.sicht.dispatch({ type: "sicht/singleSelectCommitted", ... })` after successful commit.
- `singleSelect/effects/resolveFilterValueFromTable.js` resolves `Sicht` `BW` / `DEZPV` via `sicht_bw` / `sicht_dezpv`.
- `filterDock/effects/dispatchSingleSelectHandoff.js` routes `filterType: "sicht"` to `_KDB.api.sicht`.
- Bootstrap and CSS registration remain.

Acceptance:

- No regression in the commit/notify/history path.

---

## Section D. Forbidden actions

Do not:

- modify `.cursor/rules/`;
- modify contract templates;
- modify legacy trees;
- modify `TEST/`;
- add events or `eventSubscribe.md`;
- add Dienststelle / hierarchy behavior;
- write foreign state;
- read `_KDB.runtime.filterDock` from `sicht`;
- put `BW`, `DEZPV`, `Alle`, `byOption`, or `kdb-sicht-*` logic under `filterDock/`;
- touch files outside Section B unless you stop and report first.

---

## Section E. Self-verification

Before reporting back, verify:

1. `filterDock/effects/applySichtPopupAvailability.js` no longer exists.
2. No `APPLY_SICHT_POPUP_AVAILABILITY_REQUESTED` remains.
3. No `filterDock/applySichtPopupAvailabilityRequested` remains.
4. No hardcoded `BW`, `DEZPV`, `Alle`, `byOption`, or `kdb-sicht-` remains under `dashboard/filters/filterDock/`, except generic `filterType: "sicht"` routing/classification.
5. `syncSichtOptionAvailability.js` performs local Sicht DOM sync and returns real counts.
6. `handleSichtFilterDockHandoff.js` calls local sync, not filterDock DOM dispatch.
7. No file under `sicht/` reads `_KDB.runtime.filterDock`.
8. Live popup/filter refs used by Sicht live only under `_KDB.runtime.sicht.domRefs`.
9. Every touched JS file is <=150 lines.
10. No events, foreign state writes, direct `_KDB.state.tableData` reads, or Dienststelle behavior were added.
11. No lint diagnostics were introduced.

---

## Section F. Report template

Final report must include:

1. Pre-flight echo (11 summaries).
2. File checklist with created/modified/deleted paths and final line counts.
3. Fix confirmation for C1-C4.
4. Self-verification result for E1-E11.
5. Deviations, if any.
