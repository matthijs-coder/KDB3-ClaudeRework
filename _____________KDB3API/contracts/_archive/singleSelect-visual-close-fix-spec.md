# Fix Spec: `singleSelect` visual/class alignment + popup close integration

> Planning artefact for the next KDB3 direct-port fix tranche.  
> Do not execute production edits until the FILTERDOCK-SCOPE gates below are approved by the user / filterDock planning AI.

---

**Status:** Draft for approval  
**Module / contracts:** `singleSelect.md`, `filterDock.md`, `filterDock-downstream-handoff-contractdelta.md`, `filterDock-singleSelect-integration-contractdelta.md`  
**Related delta:** `singleSelect-popupReady-sync-contractdelta.md`  
**Planner:** GPT-5.5, 2026-05-22  

---

## 1. Investigation Report

### A. CSS-only fixes

Current production CSS is loaded:

```txt
KDB3/js/core/css/config/cssHrefList.js
```

contains:

```txt
./v1/ext/KDB3/css/singleSelect.css
```

But most active selectors depend on `.KDB_singleSelectFilter`. If that class is missing on `.filterItemWrapper`, the CSS cannot work.

CSS also needs alignment with current owner classes:

- selected option visuals rely on `.KDB_selectedOption`;
- injected Alle row uses `.KDB_singleSelect_AlleOption`;
- commit UI uses `.KDB_singleSelectCommitInProgress`, but current `singleSelect.css` lacks the commit-state block present in `_______KDB3/KDB3/css/filters.css`;
- broad rules like `.filterItemWrapper .ba-common-listItem-wrapper:has([aria-label="Alle"])` can affect non-singleSelect filters and should be narrowed under `.filterItemWrapper.KDB_singleSelectFilter` where possible.

CSS-only changes cannot fix missing wrapper class, unchecked Cognos checkboxes, or popup close.

### B. singleSelect JS DOM sync fixes

Current `restorePopupSelection.js` toggles:

- `.KDB_selectedOption`;
- `.is-selected`;
- wrapper `aria-selected`.

It does not actively synchronize nested Cognos checkbox inputs:

- selected option should have `input.bx--checkbox.checked = true`;
- non-selected options should have `checked = false`;
- nested `[role="option"]` should get matching `aria-selected`.

This likely explains "multiple options can still be selected" visually: Cognos may leave multiple native checkbox states checked even when KDB classes are corrected.

Alle default visual should be driven by the same state:

- new per-filter state defaults to pending `"Alle"`;
- after popup sync, injected Alle row should become the only `.KDB_selectedOption`;
- all Cognos option rows should be unchecked / unselected unless pending matches their label.

### C. filterDock handoff / class tagging fixes

FILTERDOCK-SCOPE: requires user/filterDock-planning-AI approval.

Legacy `filterDock/filterDock.js` called `ensureFilterClasses(filterInfoObj)` and added:

- `KDB_singleSelectFilter` when `isSingleSelect`;
- `KDB_cascadingFilter` when upstream;
- `KDB_hierarchyFilter` when hierarchy;
- `KDB_hideAlleOption` for conditional filters without Alle availability.

Current production `filterDock` resolves identity/type/capabilities but does not add those classes. Because `filterDock` owns filter identity resolution and has the live `.filterItemWrapper`, it is the natural owner for wrapper classification classes.

Recommended next delta:

- add a focused filterDock effect such as `effects/syncFilterWrapperClasses.js`;
- call it after `resolveFilterIdentity(...)` in `resolveFilterInteraction.js`, before returning click resolution;
- mutate only the resolved `filterEl.classList`;
- do not write sibling state;
- do not pass DOM nodes downstream;
- keep live refs in `_KDB.runtime.filterDock` only.

### D. OK/Cancel close integration

FILTERDOCK-SCOPE: requires user/filterDock-planning-AI approval.

Current `singleSelect` already supports optional injected functions:

- `options.clickOriginalButton(_handoffContext, "okClickable")`;
- `options.clickOriginalButton(_handoffContext, "cancelClickable")`;
- `options.closePopup()`.

But `KDB.js` mounts `singleSelect` with `{}`, so these functions are not wired. Therefore OK/Cancel can update KDB/Cognos state paths but cannot reliably close the native popup.

Because `singleSelect` must not read `_KDB.runtime.filterDock`, live DOM close/click behavior must be owned by `filterDock` or an approved filters orchestrator integration.

Recommended architecture for filterDock planning AI:

- prefer preserving `filterDock`'s dispatch-style public API;
- add owner actions rather than ad hoc named methods unless a contractdelta explicitly approves a new public method;
- candidate actions:
  - `filterDock/clickOriginalButtonRequested`
  - `filterDock/closeActivePopupRequested`
- effects execute inside filterDock using `_KDB.runtime.filterDock.domRefs.activeFilterEl` / `activePopupEl`;
- return boolean from `dispatch()` snapshot is not practical, so the action can best-effort execute and log outcome.

Alternative, if filterDock planning AI approves a public method despite dispatch-style shape:

```js
_KDB.api.filterDock.clickOriginalButton({ filterKey: "...", buttonTid: "okClickable" });
```

That requires a `filterDock` contractdelta because `module-public-api.mdc` forbids mixed public API shape without explicit motivation.

---

## 2. Decisions To Preserve

1. `singleSelect/filterDockPopupReady` is sync-only; see `singleSelect-popupReady-sync-contractdelta.md`.
2. Only `singleSelect/filterDockStateChanged` may execute confirm/cancel/option/alle/clear/close commands.
3. `singleSelect` must not add a dock-level listener or long-lived dock observer.
4. `singleSelect` must not read `_KDB.runtime.filterDock`.
5. `filterDock` must not write `_KDB.state.filters.singleSelect`.
6. `singleSelect` must not write `_KDB.state.filters.filterDock`.
7. No events or `eventSubscribe.md` changes in this tranche.
8. No `specialRights` / full `specialSingleSelect` port.

---

## 3. Approval Gates

### Gate FDS-1 — Wrapper class owner

FILTERDOCK-SCOPE: requires user/filterDock-planning-AI approval.

Decision:

Should `filterDock` add `.KDB_singleSelectFilter` and related legacy compatibility classes to `.filterItemWrapper`?

Recommendation:

Yes. `filterDock` resolves filter type/capabilities and owns the live wrapper. `singleSelect` should sync popup contents, not classify dock wrappers.

### Gate FDS-2 — OK/Cancel live DOM action owner

FILTERDOCK-SCOPE: requires user/filterDock-planning-AI approval.

Decision:

Should popup close/original OK/Cancel clicks be handled by `filterDock` owner actions / owner method?

Recommendation:

Yes, but prefer dispatch actions on `_KDB.api.filterDock.dispatch(...)` to avoid a mixed public API. If a named method is chosen, update `filterDock` contractdelta first.

### Gate FDS-3 — Wiring route into singleSelect mount options

FILTERDOCK-SCOPE: requires user/filterDock-planning-AI approval.

Decision:

How should `singleSelect` receive `clickOriginalButton` / `closePopup`?

Recommendation:

Do not pass raw filterDock runtime or DOM. Either:

- keep `singleSelect` unchanged and let its commit/cancel call a small injected adapter that dispatches filterDock owner actions; or
- replace optional functions with a narrow internal effect that calls `_KDB.api.filterDock.dispatch({ type: ... })`, if approved as a direct API dependency in `singleSelect` contractdelta.

---

## 4. Allowed Edit Scope After Gates

### singleSelect scope

Allowed:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/restorePopupSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/syncPopupFooter.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/runSingleSelectInteraction.js
```

Create focused helper only if needed:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/syncPopupOptionSelection.js
```

### CSS scope

Allowed:

```txt
_____________KDB3API/KDB3/css/singleSelect.css
```

### filterDock scope

FILTERDOCK-SCOPE: requires approval before execution.

Allowed after approval:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/resolveFilterInteraction.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/syncFilterWrapperClasses.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/clickOriginalPopupButton.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/closeActivePopup.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/createFilterDockController.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/config/actions.js
```

Do not modify unless explicitly approved:

```txt
KDB3/js/KDB.js
KDB3/js/dashboard/filters/__orchestratorFilters.js
KDB3/js/dashboard/filters/sicht/
KDB3/js/dashboard/filters/dienststelle/
KDB3/js/core/cognosAPI/filters.js
architecture/eventSubscribe.md
.cursor/rules/
legacy trees
```

---

## 5. Required Fixes

### F1 — Add wrapper classification in filterDock

FILTERDOCK-SCOPE: requires approval.

Add `effects/syncFilterWrapperClasses.js`.

Behavior:

- Input: `filterEl`, `identity`.
- Add `KDB_singleSelectFilter` when `identity.filterType === "singleSelect"` or `"specialSingleSelect"`.
- Add `KDB_cascadingFilter` when `identity.capabilities.isUpstream === true`.
- Add `KDB_hierarchyFilter` when `identity.capabilities.isHierarchy === true`.
- Toggle `KDB_hideAlleOption` only when `identity.capabilities.condition` is present:
  - on when `identity.capabilities.hasAlleOption !== true`;
  - off when `hasAlleOption === true`.
- Do not remove unrelated classes.
- Do not write state.
- Do not include DOM in handoff payload.

Acceptance:

- A normal singleSelect `.filterItemWrapper` gets `.KDB_singleSelectFilter` on first click/open.
- Existing CSS selectors under `.KDB_singleSelectFilter` become active.

### F2 — Synchronize checkbox and option DOM state in singleSelect

Implement or split `syncPopupOptionSelection.js`.

Behavior:

- For every popup option wrapper:
  - determine label (`"Alle"` for `.KDB_singleSelect_AlleOption`, otherwise visible `.ba-common-truncatedText__text`);
  - compare against pending selection display value;
  - toggle `.KDB_selectedOption`;
  - toggle `.is-selected` only on the current wrapper as current code does;
  - set wrapper `aria-selected`;
  - set nested `[role="option"]` `aria-selected`;
  - set nested `input.bx--checkbox.checked`;
  - set nested checkbox `aria-checked` if present.
- Selected row must be the only checked row.
- Non-selected Cognos rows must be actively unchecked.

Acceptance:

- Default pending `"Alle"` makes injected Alle visually selected.
- Selecting one Cognos option removes checked/selected state from every other option.
- `popupReady` can run this sync repeatedly without committing or changing pending state.

### F3 — Keep `popupReady` sync-only

No behavior widening.

Acceptance:

- `runSingleSelectInteraction.js` still returns immediately after restore/sync when `actionType === "singleSelect/filterDockPopupReady"`.
- No intent derivation or command action happens for popup-ready.

### F4 — CSS alignment

Edit `singleSelect.css` narrowly.

Required:

- keep existing `KDB_singleSelectFilter` compatibility class selectors;
- narrow broad hiding rules to `.filterItemWrapper.KDB_singleSelectFilter` where possible;
- add commit-state CSS from `_______KDB3/KDB3/css/filters.css` lines around the `KDB_singleSelectCommitInProgress` block, cleaned for formatting;
- ensure `.KDB_singleSelect_AlleOption.KDB_selectedOption` receives the same visual selected checkbox treatment as normal rows;
- preserve current hide-Alle behavior under `.filterItemWrapper.KDB_singleSelectFilter.KDB_hideAlleOption`.

Do not:

- rewrite the full stylesheet;
- modify legacy trees;
- introduce new canonical class names in this tranche unless keeping legacy compatibility breaks.

Acceptance:

- CSS remains loaded from `cssHrefList.js`.
- Alle row and one selected option use the same visual selected styling.
- Commit-in-progress disables pointer events / hides checkbox label details as legacy did.

### F5 — OK/Cancel close integration

FILTERDOCK-SCOPE: requires approval.

Preferred design:

- Add filterDock owner actions:
  - `filterDock/clickOriginalButtonRequested`
  - `filterDock/closeActivePopupRequested`
- `filterDock.dispatch(...)` routes these actions to effects that use only `_KDB.runtime.filterDock.domRefs`.
- The action payload is serializable:

```js
{
  filterKey: "global__Geschlecht",
  filterId: "global__Geschlecht",
  buttonTid: "okClickable" // or "cancelClickable"
}
```

- The effect must verify active refs match the current filter when possible.
- It should click the original Cognos button only inside filterDock.
- It should log and no-op if refs/buttons are missing.

Then wire `singleSelect` to request those actions through an approved integration adapter, not by reading filterDock runtime.

Acceptance:

- OK commit can close or trigger original Cognos OK through filterDock ownership.
- Cancel can trigger original Cognos Cancel / close through filterDock ownership.
- `singleSelect` still has no `_KDB.runtime.filterDock` reads.

---

## 6. Verification

Run after execution:

1. `ReadLints` on every touched JS/CSS file.
2. Static search confirms no `singleSelect` file reads `_KDB.runtime.filterDock`.
3. Static search confirms no new events / `eventSubscribe.md` changes.
4. Static search confirms no legacy files changed.
5. Manual smoke:
   - open normal singleSelect filter;
   - wrapper has `.KDB_singleSelectFilter`;
   - Alle is visually selected by default;
   - selecting an option leaves only one checked/selected row;
   - OK commits and closes or triggers original OK;
   - Cancel reverts and closes or triggers original Cancel;
   - no OK-button flicker loop after confirm.

---

## 7. Executing-AI Prompt

Use this prompt for the executing AI only after FILTERDOCK-SCOPE gates are resolved:

```text
You are the executing AI for KDB3 singleSelect visual/class alignment + popup close integration.

Read first:
1. _____________KDB3API/contracts/singleSelect.md
2. _____________KDB3API/contracts/filterDock.md
3. _____________KDB3API/contracts/filterDock-downstream-handoff-contractdelta.md
4. _____________KDB3API/contracts/filterDock-singleSelect-integration-contractdelta.md
5. _____________KDB3API/contracts/singleSelect-popupReady-sync-contractdelta.md
6. _____________KDB3API/contracts/singleSelect-visual-close-fix-spec.md
7. The relevant .cursor/rules: state, runtime, module-public-api, events, feature-structure, naming, error-handling, dom, amd.

Echo one sentence per file/rule before editing.

Task:
Implement only the approved parts of `singleSelect-visual-close-fix-spec.md`.

Hard constraints:
- Do not edit production files outside the allowed scope in the spec.
- Do not edit legacy trees.
- Do not edit `.cursor/rules/`, architecture authority docs, templates, or `eventSubscribe.md`.
- Do not add events.
- Do not port specialRights.
- Do not add a dock-level listener or long-lived dock observer in singleSelect.
- Do not read `_KDB.runtime.filterDock` from singleSelect.
- Do not let filterDock write `_KDB.state.filters.singleSelect`.
- Do not let singleSelect write `_KDB.state.filters.filterDock`.
- Preserve `singleSelect/filterDockPopupReady` as sync-only.

Implement:
1. FILTERDOCK-SCOPE approved class tagging, if approval is present.
2. singleSelect option DOM sync so only pending selection is checked/selected.
3. CSS alignment in `KDB3/css/singleSelect.css`.
4. FILTERDOCK-SCOPE approved OK/Cancel close integration, if approval is present.

After edits:
- Run lints on touched files.
- Report files changed with line counts.
- Report whether F1-F5 pass.
- Report static checks for forbidden runtime/state/event access.
- Report manual smoke steps still needed.
```

