# Execution Spec: vis grouping — B Monat-hole (P2)

> Mechanical spec for grok 4.6 army. Architecture lives in `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` **§4.2 / §4.3 / §4.4** (P2 amend).
> This is **not** the B chrome program. Leave `widgetVis-grouping-jahr-stichtag-b-execution-spec.md` **`Executed`**. Do not stamp Step B `Implemented`.
> Echo Section A **before** producing files.

---

**Status:** `Executed` — W-GRAIN + W-APPLY landed; dual JS GREEN/GREEN 2026-09-11 night. PO canvas B step 2 **green** 2026-09-12. Grouping-delta Step B `Implemented`.
**Module / contract:** `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` §4.2 / §4.3 / §4.4
**Phase:** `extension` (B canvas step-2 hole only)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-11 night
**Executing AI:** grok 4.6 army
**Reviewer:** captain + dual grok 4.6 review

---

## Waves (do not invert)

| Wave | Writers | Starts when |
|---|---|---|
| **W-GRAIN** | one writer | spec Ready |
| **W-APPLY** | one writer | spec Ready (∥ GRAIN; no shared files) |

## Exclusive allowlists (no two writers on the same file)

### W-GRAIN

**May edit:**

- `KDB3/js/core/config/visualizations/bindingSpecsGrain.js`

**Must not edit:** apply helper, visTypes body, planner, chrome, `buildBindingSpec.js`, grouping-delta.

### W-APPLY

**May edit:**

- `KDB3/js/dashboard/widgets/widgetVis/effects/applyGrainOverlayOnClone.js`

**Must not edit:** grain file, visTypes body, planner, chrome, `buildBindingSpec.js` (150; already passes `_parameterMap`), grouping-delta.

### Nobody in this hole

`bindingSpecsVisTypes.js`, `buildLocalFilters.js`, `resolveFilterItemId.js`, `parameterMap.js`, `buildBindingSpec.js`, `sorting.js`, chrome maps, CSS, `handleApplySetting.js`, stamp, shards, title readers, writeback, history, `.mdc`, grouping-delta (captain-only), B chrome spec.

---

## Section A. Pre-flight read list

Each writer **must** read in order, then echo **one sentence per item** before producing files. Stop if a summary is missing. Do **not** paste rule-file bodies into chat.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc`
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc`
12. `_____________KDB3API/contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` (**§4.2 Line.jahr**, **§4.3**, **§4.4** only)
13. This execution spec.

Also echo: P2 — catalog keys stay logical; apply expands only overlay `Monat`/`Jahr` via `*_widget_localfilter_KID` into a **new** map; `AggregationstypId` stays logical; live overlay is not mutated; no `Jahr: null`; List/Prognose overlay stays undefined.

---

## Section B. Files

```
KDB3/js/core/config/visualizations/
  bindingSpecsGrain.js

KDB3/js/dashboard/widgets/widgetVis/effects/
  applyGrainOverlayOnClone.js
```

---

## Section C. Per-file specifications

#### `KDB3/js/core/config/visualizations/bindingSpecsGrain.js`

- **Role:** pure config (`grainByBucket`)
- **Lines:** stay ~57–60 (hard 150; this is config).
- **AMD imports:** `define([])` unchanged.
- **Change:** Line.jahr `widgetFilter` becomes `{ AggregationstypId: null, Monat: null }` only.
- **Must not:** unique-name keys; `Jahr: null`; edit pie / StackedBar / StackedColumn / Prognose rows; add `grains.jahr` on Prognose.
- **Rules to apply:** `amd.mdc` (no extra import); `naming.mdc`; `feature-structure.mdc` (config file). Contract §4.2 / §9 (no unique names in overlay).

#### `KDB3/js/dashboard/widgets/widgetVis/effects/applyGrainOverlayOnClone.js`

- **Role:** clone-only grain apply helper
- **Lines:** now 111; target ~121–136; hard **150**.
- **AMD imports:** `define([])` **must stay empty**. Do **not** import `parameterMap.js` or `resolveFilterItemId`.
- **Factory parameters:** `_clone`, `_overlay`, `_parameterMap` (already). Underscore on boundary inputs.
- **Factory-scope named helper** (never nested inside `applyGrainOverlayOnClone`):
  - `function expandWidgetFilterKeys(_widgetFilter, _parameterMap)`
  - Copy into a **new** object. Do **not** mutate `_widgetFilter` (live catalog).
  - For each own key: if key is exactly `"Monat"` or `"Jahr"` and `_parameterMap` has a **string** `Monat_widget_localfilter_KID` / `Jahr_widget_localfilter_KID`, write the value onto **that** string key and **drop** the logical key.
  - All other keys (including `AggregationstypId`) pass through unchanged.
  - If `_widgetFilter` is not a plain object, return it unchanged.
  - If the localfilter KID is missing / not a string, keep the logical key (same silent keep as `expandToken`).
  - Do **not** reuse `expandToken` / `*_slots_KID`.
- **Call site:** existing `widgetFilter` branch only:

```js
clone.widgetFilter = mergeWidgetFilter(
  clone.widgetFilter || {},
  expandWidgetFilterKeys(_overlay.widgetFilter, _parameterMap)
);
```

- **Keep:** `expandToken` / `expandSlotValue` for slots; `mergeWidgetFilter` exact-key `null` delete; early-out if `!_overlay`.
- **Rules to apply:** `amd.mdc` (AMD 0); `naming.mdc` (`_` on boundary); `feature-structure.mdc` (≤150, factory-scope helper); `error-handling.mdc` (pure helper; no new try/catch theater); `kdb-object.mdc` (no foreign writes; clone only). Contract §4.4.5: do not mutate live catalog.

---

## Section D–I

Not a new module. No reducer, no new `_KDB.api`, no harness, no mock. No history (C). No `grp` (D). No chrome.

---

## Section J. Acceptance

1. Line.jahr catalog overlay is `{ AggregationstypId: null, Monat: null }` — logical keys only.
2. Apply expands overlay `Monat`/`Jahr` via `*_widget_localfilter_KID` **before** merge. Line-body TM1 Monat key is deleted. Jahr unique-name exclude stays.
3. `AggregationstypId: null` still deletes the **logical** body key (factory can write Jahr caption).
4. pie/stacked stichtag ADD logical `Monat` still lands (remap-replace, not copy-both keys).
5. List / Prognose: overlay undefined → apply early-out unchanged.
6. Live `grainByBucket` object is not mutated (expand copies).
7. AMD `[]` on both files. apply ≤150. `buildBindingSpec.js` untouched (still 150).
8. No `Jahr: null`. No occupancy scan. No planner / visTypes / chrome edit.
9. Report: Section A echoes + file table (path, lines, matches spec | deviation).

---

## Section K. Forbidden

- Edit `.mdc`, B chrome spec, grouping-delta (captain-only), templates.
- Legacy trees. Commit / push / git config.
- Import `parameterMap.js` / `resolveFilterItemId`. Reuse `expandToken` for filter keys.
- Expand `AggregationstypId`. Expand clone-side keys. Expand kennzahl `extraFilter`.
- Mutate `_overlay` / live catalog. Leave both `"Monat"` and the unique-name on the clone.
- `Jahr: null` on Line.jahr. Unique names in grain file.
- Occupancy / slot-scan (P3). New file / service / `_KDB.services.grouping`.
- Touch `buildBindingSpec.js`, visTypes, planner, chrome, shards, title, sorting.
- Stamp Step B `Implemented`. Start C/D/E. Close Q6. Design Diagramm standard.
- Skip Section A echo.

---

## Section L. Writer report

1. Pre-flight echo (13 items + P2 sentence).
2. File checklist (path, lines, matches | deviation).
3. Deviations with motivation.
4. Section J pass/fail.

---

## Section M. Captain / dual review

1. Confirm echoes.
2. Read both allowlisted files; `ReadLints` on `.js`.
3. Grep: no `Jahr: null`; no `*_slots_KID` on filter expand; no `resolveFilterItemId`; no `parameterMap.js` import; `Monat: null` only on Line.jahr; `expandWidgetFilterKeys` copies.
4. Dual review (FAIL/NIT only; listed paths; do not paste `.mdc`).
5. Do not stamp B `Implemented`. PO canvas step 2 only.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-11 night | `Draft` → `Ready for execution` | captain (PO: P2 lock + second-pass hold) | W-GRAIN ∥ W-APPLY. |
| 2026-09-11 night | `Ready for execution` → `Executed` | captain; army W-GRAIN + W-APPLY; dual R1/R2 GREEN/GREEN | Await PO canvas step 2. |
| 2026-09-12 | PO canvas step 2 green | PO vastenburg | B `Implemented`. |
