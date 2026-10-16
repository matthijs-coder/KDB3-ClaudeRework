# Fix Spec: `filterDock` contract and dispatch visibility sync

> CP-gated contract/visibility tranche for aligning `filterDock.md` with the implemented router + popup-ready integration phase.
> This is a planning/contract-first tranche. Do not rename files or add production logging until the CP decisions below are approved.

---

**Status:** `Requires CP approval before execution`
**Date:** 2026-05-26
**Owner module:** `filterDock`
**Base contracts:**

```txt
_____________KDB3API/contracts/filterDock.md
_____________KDB3API/contracts/filterDock-downstream-handoff-contractdelta.md
_____________KDB3API/contracts/filterDock-compat-boundary-fix-spec.md
```

This spec resolves contract drift only. It must not change runtime behavior unless a later execution spec explicitly expands scope.

---

## Section A. Required Pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/events.mdc`
5. `_____________KDB3API/.cursor/rules/dom.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/amd.mdc`
9. `_____________KDB3API/contracts/filterDock.md`
10. `_____________KDB3API/contracts/filterDock-downstream-handoff-contractdelta.md`
11. `_____________KDB3API/contracts/filterDock-compat-boundary-fix-spec.md`
12. `_____________KDB3API/contracts/filterDock-contract-visibility-sync-fix-spec.md`

---

## Section B. Scope

Allowed files for this contract sync:

```txt
_____________KDB3API/contracts/filterDock.md
_____________KDB3API/contracts/filterDock-downstream-handoff-contractdelta.md
```

Allowed production files only if CP explicitly expands this tranche beyond docs:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/bindDockClickListener.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/dispatchSingleSelectHandoff.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/dispatchPopupReadyHandoff.js
```

Default execution is docs-only. If runtime logging or rename is needed, stop and request a follow-up execution spec.

---

## Section C. Current Drift

### C1. Base contract still describes pure Mode 2 observation

`filterDock.md` says the Mode 2 tranche:

```txt
does not call singleSelect, sicht, or dienststelle
```

Production code now routes click and popup-ready handoffs to known owners through public APIs:

```txt
_KDB.api.singleSelect.dispatch(...)
_KDB.api.specialSingleSelect.dispatch(...)
_KDB.api.sicht.dispatch(...)
```

This is architecturally acceptable only if the contract is updated from pure observation to router + popup-ready integration.

### C2. Dispatch visibility is unclear

The base contract requires a discovery log:

```js
console.log("[filterDock.click]", interaction);
```

Production code currently has no `console.log` under `filterDock/`. Classification can be inspected through `_KDB.api.filterDock.getState().lastInteraction`, but downstream dispatch success/failure is silent unless the target API is monkey-patched manually.

### C3. `specialSingleSelect` route differs from old contract text

Old contract mapping says `specialSingleSelect` belongs to the `singleSelect` owner family. Production code routes it to:

```txt
_KDB.api.specialSingleSelect.dispatch(...)
```

The canonical route must be documented. Do not leave dual text that suggests both `_KDB.api.singleSelect` and `_KDB.api.specialSingleSelect` own the same handoff.

### C4. `dispatchSingleSelectHandoff.js` is a misleading name

The file routes:

```txt
singleSelect
specialSingleSelect
sicht
```

It does not route Dienststelle and is not singleSelect-only. This is naming debt, not a behavior defect. Rename must be separate from contract sync unless CP explicitly approves bundling.

---

## Section D. CP Decisions Required

### D1. filterDock mode label

Option A — Keep "Mode 2" and add an integration delta:

- `filterDock.md` remains historically Mode 2, but explicitly says current production includes direct owner handoff routing.
- `filterDock-downstream-handoff-contractdelta.md` remains the detailed integration appendix.

Option B — Promote contract to current phase:

- `filterDock.md` becomes the single current contract for observer + router + popup-ready integration.
- Stale "does not call singleSelect/sicht" text is removed or rewritten.

Recommendation: **Option B**. The production module already acts as router + integrator, and the base contract should not describe an older phase as current behavior.

### D2. Click discovery visibility

Option A — Reintroduce `[filterDock.click]` as gated discovery logging:

- Add or document a dev-only/discovery flag before production `console.log`.
- Keeps runtime classification easy to inspect.
- Requires a later runtime execution spec if logging code is added.

Option B — Remove mandatory production discovery log from contract:

- Use `_KDB.api.filterDock.getState().lastInteraction` for classification.
- Use documented monkey-patch snippets for downstream dispatch proof.
- Avoids production `console.log` noise.

Recommendation: **Option B**. The cleanup direction removed production debug logs elsewhere; classification via owner state plus explicit trace snippets is enough.

### D3. `specialSingleSelect` canonical owner route

Option A — Route `specialSingleSelect` through `_KDB.api.specialSingleSelect`.

- Matches current production code and the separate `specialSingleSelect` module.
- Keeps `singleSelect` generic and avoids special-rights scope creep.

Option B — Route `specialSingleSelect` through `_KDB.api.singleSelect`.

- Matches older base contract language that treated it as the same owner family.
- Conflicts with current module split unless specialSingleSelect is folded back.

Recommendation: **Option A**. Current architecture has a separate `specialSingleSelect` owner; `filterDock` should call that public API directly.

### D4. Rename `dispatchSingleSelectHandoff.js`

Option A — Defer naming-only rename.

- Keep this contract/visibility tranche docs-only.
- Plan a later rename from `dispatchSingleSelectHandoff.js` to `dispatchFilterHandoff.js`.

Option B — Bundle rename with this tranche.

- Corrects misleading name immediately.
- Adds production import churn to a contract-sync tranche.

Recommendation: **Option A**. Rename-only cleanup should be separate and reviewable.

---

## Section E. Required Contract Sync

Default docs-only execution must update `filterDock.md` to describe current production behavior:

- `filterDock` owns dock click observation, popup observation, and serializable handoff construction.
- `filterDock` routes supported owner handoffs through direct public APIs:
  - `singleSelect` -> `_KDB.api.singleSelect.dispatch(...)`
  - `specialSingleSelect` -> `_KDB.api.specialSingleSelect.dispatch(...)`
  - `sicht` -> `_KDB.api.sicht.dispatch(...)`
  - `dienststelle` -> no dispatch until `_KDB.api.dienststelle` exists and is approved
  - `unknown` -> no dispatch
- `filterDock` still does not write sibling state.
- `filterDock` still does not call Cognos filter value APIs for commits.
- `filterDock` may proxy original popup button/close DOM actions only through its own public dispatch action path for owner-requested popup actions.
- `filterDock` owns `lastInteraction` and popup-ready state as classification/observation state, not as proof of downstream dispatch.
- Discovery logging is not mandatory in production if CP chooses D2 Option B.

If `filterDock-downstream-handoff-contractdelta.md` remains, sync it so it does not contradict `filterDock.md`.

---

## Section F. Future Runtime Follow-up Specs

Do not execute these in this contract sync unless explicitly approved:

### F1. Naming-only route helper rename

Future target:

```txt
effects/dispatchSingleSelectHandoff.js -> effects/dispatchFilterHandoff.js
```

Required behavior:

- No behavior change.
- Update imports in `bindDockClickListener.js` and `observation/dispatchPopupReadyHandoff.js`.
- Keep route map unchanged.

### F2. Optional dispatch visibility helper

If CP chooses gated visibility:

- add a narrow dev/discovery trace only under explicit runtime flag;
- never add unconditional production spam;
- distinguish classification (`lastInteraction`) from downstream dispatch proof.

### F3. Dienststelle route activation

Do not add Dienststelle dispatch in this cleanup. It requires a real `_KDB.api.dienststelle` contract and CP approval.

---

## Section G. Boundaries To Preserve

Do not:

- modify `singleSelect/`;
- modify `sicht/`;
- modify `specialSingleSelect/`;
- modify Dienststelle / hierarchy code;
- modify CSS;
- modify `KDB.js`;
- modify `filterPropId.js` or saved properties;
- modify legacy trees or `TEST/`;
- add events or edit `eventSubscribe.md`;
- change filter type resolution;
- change route behavior in this docs-only tranche;
- add unconditional `console.log`;
- rename production files unless a follow-up execution spec approves it.

---

## Section H. Verification

Static verification for docs-only execution:

1. `ReadLints` on touched contract files.
2. `filterDock.md` no longer claims current production does not call `singleSelect` or `sicht`.
3. `filterDock.md` documents current direct API routing for `singleSelect`, `specialSingleSelect`, and `sicht`.
4. `filterDock.md` documents no Dienststelle dispatch in current production.
5. `filterDock.md` distinguishes classification state from downstream dispatch proof.
6. No production files changed.
7. No events or event catalog changes.

Manual smoke:

- Not required for docs-only execution.
- If a later runtime rename/logging tranche runs:
  - normal singleSelect still routes;
  - Sicht still routes;
  - specialSingleSelect still routes;
  - unknown/dienststelle unsupported route remains no-op unless separately approved.

---

## Section I. Reporting Template

Executing AI must report:

1. Pre-flight echo.
2. CP decisions applied for D1-D4.
3. Files changed with summary.
4. Contract text changed:
   - mode/current phase;
   - dispatch routes;
   - visibility/logging policy;
   - specialSingleSelect owner route;
   - deferred rename.
5. Confirmation no production files changed, unless CP explicitly approved a runtime follow-up.
6. Static verification results.
7. Deviations or blockers.

---

## Executing-AI Prompt

```text
You are the executing AI for `filterDock` contract and dispatch visibility sync.

Project root:
c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05

Read first:
1. _____________KDB3API/contracts/filterDock-contract-visibility-sync-fix-spec.md
2. All Section A files from that spec.

Echo one sentence per file/rule before editing.

CP decisions for this execution:
- D1: Option B — promote `filterDock.md` to current observer + router + popup-ready integration phase.
- D2: Option B — remove mandatory production `[filterDock.click]` discovery log requirement; use `getState().lastInteraction` plus monkey-patch snippets for dispatch proof.
- D3: Option A — `specialSingleSelect` routes to `_KDB.api.specialSingleSelect`.
- D4: Option A — defer `dispatchSingleSelectHandoff.js` rename.

Implement docs-only unless you encounter a direct contradiction that cannot be resolved in contracts.

Allowed files:
- _____________KDB3API/contracts/filterDock.md
- _____________KDB3API/contracts/filterDock-downstream-handoff-contractdelta.md

Hard constraints:
- Do not modify production code.
- Do not add events.
- Do not modify singleSelect, sicht, specialSingleSelect, CSS, KDB.js, saved properties, legacy, or TEST.
- Do not add unconditional console.log.
- Do not rename production files in this tranche.

After edits:
- Run lints on touched contract files.
- Run static checks from Section H.
- Report using Section I.
```
