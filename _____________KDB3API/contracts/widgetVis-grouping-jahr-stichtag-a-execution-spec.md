# Execution Spec: vis grouping Jahr / Stichtag — Step A

> Mechanical spec for grok 4.6 army. Architecture lives in `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` (**Approved**, PO vastenburg 2026-09-11). Title law: `contracts/widgetVis-title-aggregation-contractdelta.md` §2 / §3 / §5 / §6 (target).
> Do **not** re-decide grain-first, overlay vocab, List XOR, Prognose PKZ, Family A, Q6, decimals/`setFormat`, or B chrome.
> No harness. Production tree only. Captain does not write these JS files.
> Three waves. **Exclusive** allowlists. Echo Section A **before** producing files.

---

**Status:** `Executed` — W1–W3 landed; dual review NIT/NIT 2026-09-11. PO vastenburg canvas green 2026-09-11 evening; grouping-delta Step A `Implemented`.
**Module / contract:** `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md`
**Phase:** `extension` (Step A only)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-11
**Executing AI:** grok 4.6 army (W1 parallel → W2 → W3)
**Reviewer:** captain + dual grok 4.6 review

---

## Waves (do not invert)

| Wave | Writers | Starts when |
|---|---|---|
| **W1** | GRAIN + SHARDS + FACTORY in **parallel** | spec Ready |
| **W2** | IDENTITY+OVERLAY (one writer) | W1 GRAIN + W1 FACTORY reported done |
| **W3** | READERS (one writer) | W1 FACTORY + W2 done |

Until B, `settings.grouping` is absent → inherit `defaultGrain` → no overlay hit → defaults match today’s titles/slots.

---

## Exclusive allowlists (no two writers on the same file)

### W1-GRAIN — `bindingSpecs` sibling catalog

**May create:**

- `KDB3/js/core/config/visualizations/bindingSpecsGrain.js`
- `KDB3/js/core/config/visualizations/bindingSpecsVisTypes.js`

**May edit:**

- `KDB3/js/core/config/visualizations/bindingSpecs.js` (become the 2-import barrel only)

**Must not edit:** shards, factory, identity, overlay, planner, title, `__orchestratorConfig.js`, `definitions.js`, `sorting.js`, `parameterMap.js`.

### W1-SHARDS — kennzahl caption reshape

**May edit:**

- `KDB3/js/core/config/visualizations/kennzahlDefaults/pA.js`
- `KDB3/js/core/config/visualizations/kennzahlDefaults/pAbs.js`
- `KDB3/js/core/config/visualizations/kennzahlDefaults/pBil.js`
- `KDB3/js/core/config/visualizations/kennzahlDefaults/pBez.js`
- `KDB3/js/core/config/visualizations/kennzahlDefaults/pFl.js`
- `KDB3/js/core/config/visualizations/kennzahlDefaults/pPs.js`
- `KDB3/js/core/config/visualizations/kennzahlDefaults/pS.js`
- `KDB3/js/core/config/visualizations/kennzahlDefaults/pL.js`

**Must not edit:** `kennzahlDefaults.js` barrel (export keys stay codes). No other files.

### W1-FACTORY — caption → Caption-path filter

**May create:**

- `KDB3/js/core/config/visualizations/buildKennzahlAggregationFilter.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetVis/config/visTypes/resolveVisualizationDefinitions.js` (import + re-export the factory only)

**Must not edit:** AMD-9 barrel (W2), shards (W1-SHARDS), identity, overlay, planner, title.

### W2 — identity + overlay + `buildBindingSpec`

**May create:**

- `KDB3/js/dashboard/widgets/widgetVis/effects/applyGrainOverlayOnClone.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetVis/config/visTypes/resolveVisTypeIdentity.js`
- `KDB3/js/dashboard/widgets/widgetVis/config/resolveVisualizationBindingConfig.js` (re-export lines only — **no 10th import**)
- `KDB3/js/dashboard/widgets/widgetVis/effects/buildBindingSpec.js`

**Must not edit:** W1 files, planner, title, `mapSettings` keys (do not add `grouping` there), `resolveBindingContext.js`, `definitions.js`.

### W3 — planner + title readers

**May edit:**

- `KDB3/js/core/services/widgetBindingPlan/filters/buildLocalFilters.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/resolveTitleAggregationLabel.js`

**Must not edit:** factory file (import/re-export only), identity, overlay, shards, `buildVisualizationTitleText.js`, `syncVisualizationTitle.js` (already call the helper).

### Nobody in A

`controlDefinitions.js`, `options.js`, intent maps, `kindToStateKey`, `bindWidgetSettingsPanel.js`, `grouping.svg` wiring, CSS hide, focus keep-list, writeback `grp`, `dropdownDefaults.js`, `applyVisualizationProperties.js`, `topNHelper.js`, `stampPanelVisType.js`, `__orchestratorConfig.js`, `.mdc`, contracts (except captain).

---

## Section A. Pre-flight read list

Each writer **must** read in order, then echo **one sentence per item** before producing files. Stop if a summary is missing.

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
12. `_____________KDB3API/contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` (Approved)
13. `_____________KDB3API/contracts/widgetVis-title-aggregation-contractdelta.md` (§2 / §3 / §5 / §6 only, if this writer touches title or packs)
14. This execution spec.

Also echo the grouping delta in one sentence (grain-first, sibling overlay, factory Caption path, List not XOR).

---

## Section B. Files

```
KDB3/js/core/config/visualizations/
  bindingSpecsGrain.js          (new, W1-GRAIN)
  bindingSpecsVisTypes.js       (new move, W1-GRAIN)
  bindingSpecs.js               (barrel, W1-GRAIN)
  buildKennzahlAggregationFilter.js  (new, W1-FACTORY)
  kennzahlDefaults/p*.js        (reshape, W1-SHARDS)

KDB3/js/dashboard/widgets/widgetVis/config/visTypes/
  resolveVisualizationDefinitions.js  (re-export factory, W1-FACTORY)
  resolveVisTypeIdentity.js           (grain helpers, W2)

KDB3/js/dashboard/widgets/widgetVis/config/
  resolveVisualizationBindingConfig.js  (re-export only, W2)

KDB3/js/dashboard/widgets/widgetVis/effects/
  applyGrainOverlayOnClone.js   (new, W2)
  buildBindingSpec.js           (call after clone, W2)
  resolveTitleAggregationLabel.js  (W3)

KDB3/js/core/services/widgetBindingPlan/filters/
  buildLocalFilters.js          (W3)
```

---

## Section C. Per-wave must-do

### W1-GRAIN

1. Move the current `bindingSpecs.js` **data object** (everything inside `return { ... }`) to `bindingSpecsVisTypes.js` as `define([], function () { "use strict"; return { ... }; })`. Do not change slot bodies. Do not add grain keys onto `visTypeByBucket`.
2. On `visualizationTypeToBucket` in that moved object, add `"com.ibm.vis.custom.prognoseyear": "com.ibm.vis.custom.prognoseyearlinechart"`. Keep existing aliases (`Pie`/`pie`, both Prognose names already present).
3. `bindingSpecs.js` becomes:

```js
define(["./bindingSpecsVisTypes.js", "./bindingSpecsGrain.js"], function (_visTypes, _grain) {
  "use strict";
  return Object.assign({}, _visTypes, _grain);
});
```

Orch path stays `./visualizations/bindingSpecs.js`. AMD 12 unchanged.

4. `bindingSpecsGrain.js` exports **only** `{ grainByBucket: { ... } }` with this exact product (tokens, not unique names):

```json
{
  "Line": {
    "defaultGrain": "stichtag",
    "grains": {
      "jahr": {
        "categories": "Jahr",
        "series": "",
        "widgetFilter": { "AggregationstypId": null }
      }
    }
  },
  "pie": {
    "defaultGrain": "jahr",
    "grains": {
      "stichtag": {
        "repeatHorizontal": ["Jahr", "Monat"],
        "widgetFilter": {
          "AggregationstypId": { "include": ["Stichtag"] },
          "Monat": { "exclude": ["Gesamt", "ALLE"] }
        }
      }
    }
  },
  "StackedBar": {
    "defaultGrain": "jahr",
    "grains": {
      "stichtag": {
        "categories": ["Jahr", "Monat"],
        "widgetFilter": {
          "AggregationstypId": { "include": ["Stichtag"] },
          "Monat": { "exclude": ["Gesamt", "ALLE"] }
        }
      }
    }
  },
  "StackedColumn": {
    "defaultGrain": "jahr",
    "grains": {
      "stichtag": {
        "categories": ["Jahr", "Monat"],
        "widgetFilter": {
          "AggregationstypId": { "include": ["Stichtag"] },
          "Monat": { "exclude": ["Gesamt", "ALLE"] }
        }
      }
    }
  },
  "com.ibm.vis.custom.prognoseyearlinechart": {
    "defaultGrain": "stichtag"
  }
}
```

No `List` row. No `grains.jahr` on Prognose. No `grains: {}`. No `lockedGrain`. Line `categories` is a **string**. `series: ""` is written. Pie omits `categories`.

- **Lines:** grain file target < 80; barrel < 20; vis-types file ≈ current 238 (grandfathered).
- **Rules to apply:** `amd.mdc` full-compact; `naming.mdc`; `feature-structure.mdc` (pure config). No Cognos.

### W1-SHARDS

For **each** of the 113 codes:

1. Keep `formatType`.
2. `jahrCaption` = first include of today’s **`allOther`** Aggregationstyp Caption-path filter (closed set). If a code has no `allOther` include, stop and report — do not invent.
3. Drop packs `Line`, `List`, `com.ibm.vis.custom.prognoseyearlinechart`, `allOther`.
4. Drop every `decimals` key.
5. **Delete** filter objects whose key is exactly `"Monat"` (25 objects / 13 codes: 23 in `pA.js`, 2 in `pAbs.js`). Do **not** remap to TM1.
6. Collect leftover **non-Aggregationstyp** filter rows (any pack, any remaining key that is not the Caption path and not `"Monat"`). Put them on the code as `extraFilter` (object of raw `itemId` → include/exclude). If none, omit `extraFilter`.
7. **Keep** `P_ABS_K_KF_02` `"Jahr"` exclude `2025` as `extraFilter`. Do not expand it.
8. Result shape:

```js
"P_L_Q_01": {
  formatType: "percent",
  jahrCaption: "Monatsdurchschnitt"
}
```

Do not write `stichtag` / `jahr` / `list` pack objects on the code. Factory builds those includes. Do not write `jahrAggregation`.

- **Rules to apply:** `amd.mdc`; `naming.mdc`; grandfathered shard sizes (do not split). Count codes after: still **113**.

### W1-FACTORY

New `buildKennzahlAggregationFilter.js`:

- `define([], function () { ... return { buildKennzahlAggregationFilter: buildKennzahlAggregationFilter }; })`
- Caption path **once** (today’s shard key, also `parameterMap` `AggregationstypId_widget_localfilter_KID`):

`[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]`

- `function buildKennzahlAggregationFilter(_defaults, _pack)` factory-scope:
  - `_pack` is `"stichtag"` | `"jahr"` | `"list"` only.
  - `jahrCaption` from `_defaults.jahrCaption` (string). Missing / empty → `{ ok: true, filter: {} }` (title: no parens).
  - Include: `stichtag` → `["Stichtag"]`; `jahr` → `[jahrCaption]`; `list` → `["Stichtag", jahrCaption]`.
  - Return `{ ok: true, filter: { [Caption path]: { include: includeArray } }, extraFilter: _defaults.extraFilter || null }`.
  - **Never** use literal `"AggregationstypId"` as the filter key.
- No `_KDB` lookup. No `resolveFilterItemId`.

`resolveVisualizationDefinitions.js` (AMD 2 → 3): import the factory; add `buildKennzahlAggregationFilter: _factory.buildKennzahlAggregationFilter` to the return. Do not change `resolveKennzahlDefaults` (still returns the code object).

- **Lines:** factory target < 50. Definitions file stay < 80.
- **Rules to apply:** `amd.mdc`; `naming.mdc` (`_` on boundary inputs); `error-handling.mdc` (pure helper — no try/catch required).

### W2 — identity + overlay

`resolveVisTypeIdentity.js` (AMD 3, ~54 lines — stay ≤ 150). Add factory-scope helpers that read `bindingSpecs.grainByBucket` via existing `_readVisualizationsConfig` (no new import):

- `resolveDefaultGrain(_visualizationType, _KDB)` — `grainByBucket[bucket].defaultGrain` if string, else `undefined`.
- `resolveGrainOverlay(_visualizationType, _grain, _KDB)` — `undefined` unless `grains` has **own** `_grain` and the value is a plain object (not `null`, not array). Missing `grainByBucket` / List / Prognose → `undefined`. Do not use truthiness of `{}`.
- `resolveEffectiveGrain(_visualizationType, _grouping, _KDB)` — if `_grouping` is `"stichtag"` or `"jahr"`, that token; else `resolveDefaultGrain`.
- `resolveKennzahlPack(_visualizationType, _grouping, _KDB)` — bucket `List` → `"list"`; bucket `com.ibm.vis.custom.prognoseyearlinechart` → `"stichtag"`; else `resolveEffectiveGrain`. Never return `"allOther"` / `"Line"`.

Export all four plus existing three.

`resolveVisualizationBindingConfig.js` (AMD **9** — no 10th import): re-export the four grain helpers **and** `buildKennzahlAggregationFilter` from `_resolveVisualizationDefinitions` / `_resolveVisTypeIdentity`. Add return keys only.

`applyGrainOverlayOnClone.js` (new, AMD 0 or 1):

- `function applyGrainOverlayOnClone(_clone, _overlay, _parameterMap)` factory-scope.
- If `!_overlay` return `_clone`.
- For each own key except `widgetFilter`: `clone[slot] = expandSlotValue(overlay[slot], parameterMap)` — **whole replace**. Never `.concat` / `+` on strings.
- `expandSlotValue`: string `"Jahr"` / `"Monat"` → `parameterMap.Jahr_slots_KID` / `Monat_slots_KID` (keep **string**); array → map each token the same (keep **array**); `""` stays `""`. Values that already start with `[` pass through. Unknown token → leave as-is and do not invent.
- `widgetFilter`: deep-merge onto `clone.widgetFilter || {}`. **Replace** `AggregationstypId`. `null` **deletes** that key (not a grain lock). Other keys (`Monat`, unique names) merge.
- Do **not** run `resolveFilterItemId` on slot fields.
- Do not mutate the live catalog (caller already cloned).

`buildBindingSpec.js` (144/150, AMD 4 → **5**):

- Import `./applyGrainOverlayOnClone.js` only (grain resolve comes from the **existing** barrel import).
- After `cloneSerializable(visTypeConfig)` (~122): read `input.settings.grouping` locally (do **not** add it to `mapSettings`). `pack` unused here. `overlay = resolveGrainOverlay(visType, resolveEffectiveGrain(visType, grouping, _KDB), _KDB)`. If overlay, `applyGrainOverlayOnClone(clone, overlay, parameterMap)`.
- Need `_KDB` and `parameterMap` already on the input/spec — use the same sources the file already uses for `resolveVisTypeConfig`. If `parameterMap` is missing, skip expand (do not throw).
- Do not inline overlay. Do not overlay inside `resolveBindingContext`.

- **Rules to apply:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc` (150 cap); `error-handling.mdc` (pure helpers). No `_KDB.cognosAPI`.

### W3 — readers

`buildLocalFilters.js`:

- Delete `branchKey` ternary.
- After `addWidgetFilters`, kennzahl path: `pack = resolveKennzahlPack(visType, settings.grouping, _KDB)` via a **new import of the factory file** plus pack resolve. **Do not** add an import of the AMD-9 barrel if that would fight layers — import `buildKennzahlAggregationFilter.js` and `resolveVisTypeIdentity.js` (or the barrel if already a dep). Prefer: import factory + identity (AMD 5 → 7, under 10).
- `built = buildKennzahlAggregationFilter(kennzahlDefaults, pack)`. Upsert `built.filter` keys as **raw itemId** (no `resolveFilterItemId`). Then upsert `built.extraFilter` the same way (last-write after factory).
- `kennzahlDefaults` is still the code object from `resolveKennzahlDefaults` (now `formatType` + `jahrCaption` + optional `extraFilter`).
- Need visType + grouping + `_KDB` from `_spec` — use existing spec fields (`dataConfig.visPropBucketKey`, `spec.settings` if present). If grouping/visType missing, identity still resolves default grain / List / Prognose.
- Empty `{}` is truthy — do not `|| allOther`. There is no `allOther`.

`resolveTitleAggregationLabel.js` (AMD 1 — keep one import: the barrel):

- Delete `branchKey`.
- `visType = settings.visType || resolveDefaultVisualizationType(_KDB)` (already required).
- `pack = resolveKennzahlPack(visType, settings.grouping, _KDB)` from barrel.
- `defaults = resolveKennzahlDefaults(code, _KDB)`.
- `built = buildKennzahlAggregationFilter(defaults, pack)` from barrel.
- Captions = `built.filter[Caption path].include` (or any key matching `/aggregationstyp/i` on **that factory object only**). Do **not** read `defaults.jahrCaption`.
- Join / wrap unchanged. Missing code / empty include → no parens (vector 8).
- Do not call `resolveBindingContext`. Do not scrape Cognos.

Until W3 lands, W1 shard rename **breaks** live titles/filters. **Ship W1+W2+W3 in the same WP** before declaring A done. Writers may land files wave-by-wave; captain does not tick A Implemented until W3 + dual review.

- **Rules to apply:** `amd.mdc`; `naming.mdc`; title: no `_KDB.config.visualizations.*` deep read; `error-handling.mdc` (pure).

---

## Section D–I

Not a new module. No reducer, no new `_KDB.api`, no harness, no mock.

---

## Section J. Acceptance

1. `grainByBucket` is a sibling on the stamped `bindingSpecs` (orch still AMD 12).
2. Live Line/pie/Stacked/Prognose/List **bodies** unchanged except the Prognose short-id alias.
3. 113 codes; each has `formatType` + `jahrCaption`; no vis-type packs; no `"Monat"` short keys; `P_ABS_K_KF_02` Jahr `2025` kept.
4. Factory emits Caption path, not `"AggregationstypId"`.
5. `resolveVisTypeConfig` still returns table body only.
6. Overlay only on clone; Line jahr `categories` string; `series: ""`; pie stichtag `repeatHorizontal` `[Jahr, Monat]` after expand.
7. `branchKey` gone from **both** readers. Title and planner same pack.
8. No B files touched. No `grp`. No decimals. No `setFormat`.
9. AMD: barrel 9 imports; `buildBindingSpec` ≤ 150 and ≤ 5 imports; identity no new import.
10. Report: Section A echoes + file table (path, lines, matches spec | deviation).

---

## Section K. Forbidden

- Edit `.mdc`, `_template.md`, `_executionSpecTemplate.md`, the Approved grouping delta (captain-only).
- Legacy trees `_______KDB3/`, `_______REDESIGN2/`, `laatsteOriginal/` writes.
- New visType buckets (`LineJahr`, `pieStichtag`). Grow `bindingSpecs` vis trees.
- `.concat` on Line/Prognose `categories`. `add` vocab.
- Mutate live catalog. Overlay in `resolveBindingContext`.
- Seed grouping. `"none"` inherit. List XOR. Prognose `grains.jahr`.
- Third safeguard clone. `_KDB.services.grouping`. New `messageService` method.
- Commit / push / git config.
- Skip Section A echo.

---

## Section L. Writer report

1. Pre-flight echo (14 items).
2. File checklist (path, lines, matches | deviation).
3. Deviations with motivation.
4. Section J pass/fail.
5. Open questions (do not silently close Q6).

---

## Section M. Captain / dual review

1. Confirm echoes.
2. Read every allowlisted file; `ReadLints` on `.js`.
3. Grep: no `branchKey`; no `"Monat"` short keys in `pA.js`/`pAbs.js`; no `LineJahr`; `grainByBucket` sibling; factory Caption path.
4. Dual review (live + consistency) before A Implemented.
5. Do not start B until A is in the tree and titles still match vectors 1–4 / 10 (inherit defaults).

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-11 | `Ready for execution` | captain (PO Approved grouping-A) | W1 parallel; W2 after GRAIN+FACTORY; W3 after W2. |
| 2026-09-11 evening | `Executed` + grouping-A `Implemented` | PO vastenburg | Inherit titelhaakjes green. B is a new slice, not this spec. |
