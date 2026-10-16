# Contract Delta: vis grouping Jahr / Stichtag (grain)

> Delta on `widgetVis` binding catalog + `kennzahlDefaults` + title lookup.
> PO sequence A→E plus post-B **F**. **A/B/F/C/D/E/pie+DST `Implemented`.** **G** inherit-row look is `contracts/widgetSettings-family-a-inherit-row-chrome-contractdelta.md` (`Implemented`). Q6-A locked. Toast blijft dicht.
> PO vastenburg 2026-09-11: grain-first; two grains on Line / pie / StackedBar / StackedColumn; one live body + non-default overlay; List excepted; Prognose Stichtag-only.

---

**Status:** `Implemented` (Step A). **Step B:** `Implemented` — PO canvas 2026-09-12. **Step F:** `Implemented` — PO canvas 2026-09-12. **Step G:** inherit-row look — chrome delta `Implemented`. **Step D:** `Implemented` — PO canvas 2026-09-12 (1–6, 8 green). **pie+DST:** `Implemented` — PO canvas 2026-09-12. **Step E:** `Implemented` — PO confirm 2026-09-12 (docs-only). **Step C:** `Implemented` — PO canvas 2026-09-12 (undo/redo). Toast blijft dicht.
**Owner module / service:** `widgetVis` (catalog + overlay + title reader + apply/stamp); `widgetBindingPlan` (reads stamped `dataConfig.grouping`); `widgetSettings` owns the B control
**Type:** `feature-module contract delta`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-11
**Reviewed by:** pending PO
**Related rules:** `feature-structure.mdc` (workflow), `state.mdc`, `amd.mdc`, `naming.mdc`
**Family:** grouping is Family A (KEEP-via-A) — `contracts/widgetSettings-setting-family-contractdelta.md`. Do not seed. Do not reuse `"none"`.

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/widgetVis-title-aggregation-contractdelta.md` | **§2 / §3 / §5 / §6 in A.** Pack keys `stichtag` \| `jahr` \| `list`. Title reads the same factory as `buildLocalFilters`. §6 no longer forbids a settings grain control; title still does not own it. |
| `contracts/widgetVis.md` | §1 / §13 pointer: aggregation follows **effective grain**, not vis-type `branchKey`. |
| `contracts/widgetBindingPlan.md` | `kennzahlDefaults` packs are grain keys via the factory, not `visPropBucketKey`. |
| `contracts/widgetSettings.md` §4.2 | Already points here for chrome/API. A does not add the control. |
| `contracts/writeback.md` | **D Approved:** vis optional `grp`. Q6-A. Parent patches §13.8 applied. |
| `contracts/historyService.md` | **No new key.** C reuses `widgetSettings_optionSelect`. |
| `contracts/widgetVis-show-values-contractdelta.md` | D2 Frozen except inherit-row chrome (family-a-inherit-row-chrome). Do not merge grouping into `stampPanelVisType` `inheritKey`. |

---

## 1. Purpose

Users will pick **grain** (Stichtag vs Jahr) per vis widget. Grain is **time slot + Aggregationstyp together**. Filter-only swap is wrong.

Step A puts that law in config and in the two readers that already branch on vis-type packs (planner + title). The dropdown is Step B.

---

## 2. Product (locked)

| Topic | Decision |
|---|---|
| Grains | Tokens `"stichtag"` \| `"jahr"` (lowercase). Not `"none"` / `"default"` / `""`. |
| XOR vis | Line, pie, StackedBar, StackedColumn — user can pick either grain. |
| Defaults | Line = `stichtag`. pie / StackedBar / StackedColumn = `jahr`. |
| List | **Excepted** from XOR, chrome, history, and writeback. Dual `grid_cols` Jahr+Monat. Dual title captions. No grouping field. Kennzahl pack key still renamed `List` → `list` in A (same factory, same dual include). |
| Prognose | Catalog body **is** Stichtag+PKZ. **No** `grains.jahr` (Jahr would drop PKZ). Chrome hide = B (keep DOM). |
| Slot law | Line→jahr = **replace** time on `categories` (Jahr **string**) + `series: ""`. pie→stichtag = **add** Monat onto `repeatHorizontal` → `[Jahr, Monat]`. Stacked*→stichtag = **add** → `categories: [Jahr, Monat]`. Never Monat on pie `categories` (Geschlecht / dim). |
| Cap / toast | **None.** IBM Repeat clip is a user issue. Still exclude Monat `Gesamt` / `ALLE` (data hygiene). |
| Family | A inherit. Unset = catalog `defaultGrain`. Explicit KEEP across visType. |
| Stamp names | `bindingSpecs` / `kennzahlDefaults` stay. Internal keys change. |
| Decimals / `setFormat` | **Not A.** Not step E. Later WP + D4 live caller. |
| Copy | Hardcoded DE in B. Never `Gruppierung*`. Title **Zeitebene**. Options **Stichtag** / **Jahr**. |

Homonyms: Aggregationstyp member `Stichtag` ≠ Zeitraum captions; axis **Stichtag = Monat**; Prognose series dim `Stichtag` = PKZ; dashboard Jahr native filter still slices the cube.

**F supersedes** the two-token XOR / List-excepted / always-KEEP rows above. Current product law is **§12**. A/B text stays as history.

---

## 3. Two axes (no mega-file)

| Axis | Home | Owns |
|---|---|---|
| Vis slots + vis `widgetFilter` | `bindingSpecs` + sibling `grainByBucket` | Which Zeit unique name sits on which slot; vis Agg pin / clear; Monat exclude |
| Kennzahl captions | `kennzahlDefaults` + one factory | Aggregationstyp **include** captions. Stichtag is the global constant `"Stichtag"`. Jahr caption is per code. List = derive `["Stichtag", jahrCaption]`. |

Do not fold captions into `grainByBucket`. Do not fold slots into shards.

---

## 4. Vis catalog — `grainByBucket`

### 4.1 File / stamp

- New `KDB3/js/core/config/visualizations/bindingSpecsGrain.js` exports `{ grainByBucket }`.
- Merge in a `bindingSpecs` **barrel** (`Object.assign` like `kennzahlDefaults.js`). Orchestrator keeps **one** `bindingSpecs` import (already AMD 12 — no 13th).
- Live trees stay one body per bucket. **Do not** grow `bindingSpecs` vis trees (`LineJahr` / `pieStichtag`). **Do not** deep-merge overlays into `visTypeByBucket` (shallow assign would replace trees).
- `grainByBucket` is a **sibling** of `visTypeByBucket` on the stamped object. Cheaper than keys on the bucket wrapper: `resolveVisTypeConfig` returns the table body only, so grain on `visTypeByBucket` would not ride the clone; identity already has `bindingSpecs` (no extra AMD).
- `resolveVisTypeConfig` stays **table-body only** (clone source). Overlay is **not** on that object.
- `resolveVisTypeIdentity` already reads `bindingSpecs` (AMD 3). Grain resolve lives there; AMD-9 barrel **re-exports only** (no 10th import).
- `definitions.js` stays chrome (showValues inherit). No grain keys. No hide-list as the grain lock.

### 4.2 Shape

A grain overlay exists only as an **own-property** whose value is a **plain object**. Missing key = no overlay. Do not write `grains: {}`. Do not use `null` / `lockedGrain`. Empty `{}` is truthy — apply uses `hasOwnProperty` + plain-object, not truthiness.

| Bucket key | `defaultGrain` | `grains` |
|---|---|---|
| `Line` | `"stichtag"` | `jahr` only |
| `pie` | `"jahr"` | `stichtag` only |
| `StackedBar` | `"jahr"` | `stichtag` only |
| `StackedColumn` | `"jahr"` | `stichtag` only |
| `List` | **omit** (absent row) | **omit** |
| `com.ibm.vis.custom.prognoseyearlinechart` | `"stichtag"` | **omit** (no `jahr`) |

Keep both IBM Prognose aliases. Optional A hygiene: add `com.ibm.vis.custom.prognoseyear` on `visualizationTypeToBucket` → linechart bucket. Do not rename bucket keys to grain names.

Worked overlay (tokens, not unique names):

```json
{
  "grainByBucket": {
    "Line": {
      "defaultGrain": "stichtag",
      "grains": {
        "jahr": {
          "categories": "Jahr",
          "series": "",
          "widgetFilter": { "AggregationstypId": null, "Monat": null }
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
}
```

Line `categories` stays a **string** on both grains (live Monat string; jahr overlay `"Jahr"`). `series: ""` must be **written** (omit keeps body `[Jahr]`). Pie overlay **omits** `categories`. Stacked `categories` stays an **array**. Order `[Jahr, Monat]`.

Line→jahr **nulls Monat** (Monat left the slots). **Jahr exclude stays** (Jahr is on `categories`; hygiene). Do **not** write `Jahr: null` on Line.jahr. pie/stacked stichtag still **add** logical `Monat` exclude.

### 4.3 Tokens

Overlay slot values name `Jahr` / `Monat`. Expand on the **clone** via `Jahr_slots_KID` / `Monat_slots_KID` (`parameterMap.js`). Planner slot IDs stay raw TM1 unique names.

**Do not** run `resolveFilterItemId` on slot fields (`Geschlecht` would bind ID, not Tooltip). A literal `"Jahr"` left in a slot binds as that string.

Catalog overlay `widgetFilter` keys stay logical (`AggregationstypId`, `Monat`, `Jahr`). After apply, clone `Monat` / `Jahr` keys may be unique names so merge/null hits the Line-body TM1 keys. Planner still accepts both and keeps `resolveFilterItemId`.

### 4.4 Apply (clone only)

Home: helper next to `buildBindingSpec.js` (file is ~144/150 — **do not inline**). After `cloneSerializable(visTypeConfig)`:

1. `effective = resolveEffectiveGrain(visType, settings.grouping)` — string grouping → that token; else catalog `defaultGrain`. Family A: missing / non-string = inherit.
2. `overlay = grainByBucket[bucket].grains[effective]` — `undefined` if inherit/default, List, or Prognose.
3. For each overlay key except `widgetFilter`: `clone[slot] = expand(overlay[slot])` — **whole-slot replace**. Never string `.concat` / `+` (Line/Prognose `categories` is a string; concat smashes two unique names into one id). Expand **before** planner/sort: `sorting.js` keys are already unique names (`COLUMN_MONAT` / `COLUMN_JAHR`). A leftover token `"Monat"` / `"Jahr"` in a slot misses sort. Do not rewrite `sorting.js` in A.
4. `widgetFilter`: expand overlay keys `Monat` / `Jahr` via `parameterMap` `Monat_widget_localfilter_KID` / `Jahr_widget_localfilter_KID` into a **new** map **before** merge/delete. Do **not** expand `AggregationstypId` (body key is already logical; Caption-path expand would miss the delete). Do **not** call `resolveFilterItemId`. Do **not** reuse slot `expandToken` (`*_slots_KID`). Do **not** mutate the live overlay (`resolveGrainOverlay` returns `grains[grain]` by reference). Then **deep-merge**, except **replace** `AggregationstypId`. `null` = delete that exact key (no vis upsert). `{ include: [] }` / omit = no vis Agg row.
5. Do not mutate the live catalog. Do not overlay inside `resolveBindingContext`.

Planner order stays: `addWidgetFilters` then kennzahl factory; last-write on same `itemId`. Line-jahr **clears** vis Agg so the factory can write the per-code Jahr caption. pie/stacked stichtag **pins** vis Agg `Stichtag`; factory must be grain-aware or last-write smashes Stichtag with the Jahr caption.

Product “ADD Monat” is written as the **result array**. Apply never concats.

---

## 5. Kennzahl axis

Replace vis-type packs `Line` / `List` / `com.ibm.vis.custom.prognoseyearlinechart` / `allOther` with **`stichtag` | `jahr` | `list`**. List is a **third** pack, not XOR.

Per code (caption-only):

- Keep root `formatType` (`number` \| `percent`).
- Store one **Jahr caption** field `jahrCaption` (closed set: `Monatsdurchschnitt`, `Summe`, `Summe im Zeitraum`, `Anzahl im Zeitraum`, `Quote im Zeitraum`, `Durchschnitt im Zeitraum`).
- **No** `decimals` / `jahrAggregation` keys in A.

One factory emits a Caption-path filter `{ [Aggregationstyp Caption path]: { include: [...] } }`. **Must emit the Caption path**, not literal `"AggregationstypId"` (planner uses raw `itemId`; no `resolveFilterItemId` on kennzahl keys). Title must **not** read `jahrCaption` itself; planner and title both call the factory. Title still goes through `resolveKennzahlDefaults` / `resolveVisualizationBindingConfig` — no deep `_KDB.config.visualizations.*` from the title helper.

| Pack | Include |
|---|---|
| `stichtag` | `["Stichtag"]` |
| `jahr` | `[jahrCaption]` |
| `list` | `["Stichtag", jahrCaption]` (Stichtag first) |

Effective pack: List vis → `list`. Prognose → `stichtag`. Else `resolveEffectiveGrain`. **Do not** keep the `branchKey` ternary (`Line` \| `List` \| linechart else `allOther`) in `buildLocalFilters.js` and `resolveTitleAggregationLabel.js`. Helper on `resolveVisTypeIdentity`; barrel re-export; no new AMD-9 import. Title must not call full `resolveBindingContext`.

Empty `{}` is truthy — no empty packs as “inherit”. No empty `{}` as a pack body.

Hygiene (ride A): **delete** `"Monat"` short-key objects in `pA.js` + `pAbs.js` only (25 objects / 13 codes: 23 in `pA.js`, 2 in `pAbs.js`). **Do not remap** (would overwrite Line/Prognose Monat exclude `Gesamt+ALLE` with `Gesamt` only). **Do not** expand `P_ABS_K_KF_02` `"Jahr"` exclude `2025` — keep that row as a code-level extra filter (raw `itemId`, upsert after factory). `P_A_Z_08` Prognose-only `"Monat"` dies with the short-key delete (vis `widgetFilter` already covers TM1 Monat).

---

## 6. Title (A, same day)

Amended law: `contracts/widgetVis-title-aggregation-contractdelta.md` §2 / §3 / §5 / §6.

Aggregation parentheses follow **effective grain + factory**, not vis-type `branchKey`. Unset Line still `(Stichtag)`. Unset pie still `(<jahrCaption>)`. Line+explicit `jahr` → `(<jahrCaption>)`. pie+explicit `stichtag` → `(Stichtag)`. List unchanged `(Stichtag, <jahrCaption>)`. Prognose stays `(Stichtag)`.

Title still does not own chrome, history, or writeback. Grouping is a **grain** control, not a free Aggregationstyp caption picker.

TopN helper pin stays **Stichtag** (live). Do not retarget. Title-delta’s old “pin Monatsdurchschnitt” line is stale and is corrected in that amend.

---

## 7. Step A implementation scope (after Approved + execution spec)

In:

- `bindingSpecsGrain.js` + barrel merge; optional Prognose short-id alias
- kennzahl shard reshape to `formatType` + `jahrCaption` + leftover extra filters; Monat-short delete
- grain helpers on `resolveVisTypeIdentity` + barrel re-export
- overlay helper + `buildBindingSpec` call after clone (~3 lines, +1 AMD)
- factory + `buildLocalFilters` / `resolveTitleAggregationLabel` switch

Out of A (B–E):

- `controlDefinitions.js` / `options.js` / intent maps / `kindToStateKey` / `mapSettings` grouping field
- `grouping.svg` wiring, CSS hide, focus keep-list class
- writeback `grp`, GET/SET, Q6
- history (reuse existing key in C)
- `setFormat` / decimals
- `bindWidgetSettingsPanel.js` (do not edit; 208)
- `applyVisualizationProperties.js` `APPLY_ON_REASON` (grouping is not property-only)
- third `*DropdownSafeguard.js` clone
- `_KDB.services.grouping`, new `messageService` method, new visType buckets

Until B, `settings.grouping` is absent → inherit `defaultGrain` → no overlay hit → live bodies + factory packs match today’s defaults (Line/Prognose Stichtag, pie/stacked Jahr caption, List dual).

---

## 8. Reserved (C–E — not F JS)

| Step | Intent | Still open |
|---|---|---|
| **B** | §11. | **`Implemented`** 2026-09-12. |
| **F** | §12 layout-set. | **`Implemented`** 2026-09-12. |
| **G** | Inherit-row `isDefault` look. | Chrome delta **`Implemented`**. |
| **C** | Undo/redo | **`Implemented`** 2026-09-12. Reuse `widgetSettings_optionSelect`. VisType undo does not restore CLEARED grain. |
| **D** | §13 GET/SET `grp` (≤5, not `dim`); `SCHEMA_VERSION` stays 3 | **`Implemented`.** Q6-A. |
| **E** | Check D vs `vals` | **`Implemented`.** Docs-only. |

---

## 9. Anti-goals

- No second vis tree per grain. No `add` concat vocab. No unique-name copies in the overlay.
- No `timeAtCategories` tokens that cannot name Monat vs Jahr.
- No grain fields on `definitions.js`. No grouping merge into showValues `inheritKey`.
- No filter-only grain. No mutating live catalog from resolvers.
- No List **stichtag-only**. No Prognose `grains.jahr`. F List allowlist is `{jahr, jahrStichtag}` only.
- No seeding grouping. No CLEAR on visType. No `"none"` inherit.
- No constants file that duplicates `parameterMap` + shard Caption paths.
- No silent title-delta drift: pack-key change and title factory ship in the same A WP.
- No third `*DropdownSafeguard.js`. No `handleApplyGrouping.js`. No `handleApplyShowValues` clone. No grouping in `APPLY_ON_REASON`. No `bindWidgetSettingsPanel.js` edit. No `imagePaths.js` edit. No seed / `VIS_STARTUP_KINDS` / `dropdownDefaults` row. No merge into showValues `inheritKey`. No `Gruppierung*` chrome.
- No `assignOptionalString` / `commitRequiredSetting` for `grp` (that is Q6-B / Family B). No Family A writeback helper / `_KDB.services.settingFamily`. No `groupingMeta` v3 field. No `SCHEMA_VERSION` bump. No relying on panel `stampPanelVisType` CLEAR for GET/SET.

---

## 10. Open questions (do not silently close)

- **Q6** **locked Q6-A** 2026-09-12 (PO vastenburg). Omit `grp` when inherit only. See §13. Q6-B (omit-equals-`defaultGrain`) rejected.
- **B copy** — locked **Zeitebene** / **Stichtag** / **Jahr**.

---

## 11. Step B — chrome + stamp (Approved)

Dropdown so the user picks grain. Apply is a **full rebind** (slots + Aggregationstyp together). Planner sees explicit grain only via **`dataConfig.grouping`**. History is C. Writeback / Q6 is D.

**F supersedes** the two-token copy / mark / `dataConfig` rows below. Live sibling-copy, stamp mark, and `dataConfig.grouping` use the five F tokens; unset stamp marks inherit (Diagrammstandard), not `resolveDefaultGrain`. Rows below stay as B-as-written.

### 11.1 Product

| Topic | Decision |
|---|---|
| Control | Family A (KEEP-via-A). Kind `grouping`. Tokens `"stichtag"` \| `"jahr"`. Forbidden inherit tokens: `"none"`, `"default"`, `""`. |
| XOR chrome | Line, pie, StackedBar, StackedColumn. |
| Hide keep-DOM | List + Prognose: CSS `display:none` on the icon; icon stays in `live[]`. Live today hides **showValues** on List only — B **adds** grouping hide for List **and** Prognose (canvas + focus). |
| Unset chrome | Show catalog `defaultGrain` as selected. **Do not write** `settings.grouping`. |
| Click | Even the already-visible default **writes** the explicit token (KEEP across visType). visType switch does **not** CLEAR. |
| Apply | Existing `handleApplySetting` + `runBindingPipeline`. Reason `"grouping"`. Not `handleApplyShowValues`. Not `APPLY_ON_REASON`. |
| Complete snapshot | Still `{ dimension, visType, topNChoice }`. grouping optional. |
| Startup | Omit `dropdownDefaults` / `VIS_STARTUP_KINDS`. Do not seed. |
| Copy | Hardcoded DE. Title **Zeitebene**. Options **Stichtag** / **Jahr**. Never `Gruppierung*`. Not `labels.de`. |
| Icon | `KDB3/images/grouping.svg` (exists). Class `KDB_groupingButton`. Place in `live[]` **after** `visualization`. `showValues` sits just before `reset` (not the grouping neighbor). |

Homonyms unchanged (Aggregationstyp `Stichtag` ≠ Zeitraum; Prognose series Stichtag = PKZ; dashboard Jahr filter still slices).

### 11.2 KEEP inherit mark (not showValues `inheritKey`)

`stampPanelVisType` already runs on panel place, visType commit, startup, restore. From 2026-09-28 it also runs after every confirmed vis dropdown commit (`contracts/widgetSettings-focus-canvas-option-stamp-contractdelta.md`). Extend it:

1. Add `SETTINGS_VIS_KEYS` maps so **both** IBM Prognose ids stamp `"prognose"`: `com.ibm.vis.custom.prognoseyear` and `com.ibm.vis.custom.prognoseyearlinechart` (plus `prognose` itself). Today unknown raw is written through — Prognose CSS cannot use a short key until this.
2. **Every** stamp, mark the grouping option: explicit `record.grouping` if `"stichtag"` \| `"jahr"`; else `resolveDefaultGrain(record.visType)` (raw visType, not the stamp short). List / missing default → no mark (icon hidden).
3. Do **not** merge grouping into the showValues mark / `inheritKey`. Grouping mark runs every stamp even when `record.showValues` is boolean. **H:** showValues stamp **always remakes** (boolean → on/off, else inherit) — `contracts/widgetSettings-family-a-inherit-row-chrome-contractdelta.md`. Do not `return` before grouping.

`resolveDefaultGrain` via the existing widgetVis barrel (AMD 3→4 on `stampPanelVisType.js`). No `_KDB.cognosAPI`. No duplicated default table.

### 11.3 Shared wiring (family checklist)

Must land together or grouping is `scaffoldNoop`:

| Home | B add |
|---|---|
| `controlDefinitions.js` `live[]` | `{ kind:"grouping", ariaLabel:"grouping", className:"KDB_groupingButton", icon:"grouping.svg", title:"Zeitebene", dropdownClass:"KDB_groupingContainer" }` |
| `options.js` | Grain rows have **no** `isDefault` (varies by visType). **G:** inherit / Diagrammstandard row **may** set `isDefault: true` for `data-kdb-default` look (`contracts/widgetSettings-family-a-inherit-row-chrome-contractdelta.md`). |
| `buildDropdownOptions.js` | populate static `grouping` / `.KDB_groupingContainer` |
| `intentDispatchMap.js` | target `widgetVis`; type `widgetVis/applyGrouping`; `normalizeKind` needs no alias |
| `kindToStateKey.js` | `grouping → grouping` |
| `KIND_TO_CONTROL` | **not** its own file — `buildWidgetVisSettingsSnapshot.js` 8–13 + `isWidgetVisKind` |
| `actionTypes.js` | `APPLY_GROUPING: "widgetVis/applyGrouping"` |
| `actionRouter.js` | route only: `APPLY_GROUPING → handleApplySetting`. **No new import** (AMD 14 already over) |
| `handleApplySetting.js` | `payload.control` already comes from snapshot (`buildDownstreamIntentAction`). `REASON_BY_CONTROL[control] \|\| control` yields `"grouping"` — do **not** add map rows. `resolveSettings`: **two one-liners** (house-style 3-line `if`s overflow 150). No extract file. |
| Sibling optional-copy (same as showValues) | `readEffectiveSettingsContext.js` (contentCreate / controller). `handleApplyStartupSettings.js` `resolveSettingsFromSnapshot` (startup + historyReplay). `parameterSetBindingHelpers.js` `readCommittedSettings` (parameter-set rebind). Copy grouping only if `"stichtag"` \| `"jahr"`. Omit from `VIS_STARTUP_KINDS`. |
| snapshot | Extend the existing `appendExplicitShowValues` helper (token copy). **No** sibling `appendExplicitGrouping`. Restore batch: extra `changedControls` push when snapshot.grouping is a token (same as showValues boolean push). Stay ≤150. |
| `resolveCanonicalVisOptionValue.js` | **no edit** — fallthrough already returns `optionValue`; do not boolean-map grouping |
| `isCompleteSettingsSnapshot.js` | **no edit** |
| `finalizeVisIntentResult.js` | **no new import** (AMD 9). grouping rides generic vis commit (like dimension / visType), not `safeguardRole` |
| `dispatchWidgetSettingsIntent.js` | **no edit** if maps resolve (already generic, AMD 9) |
| `commitWidgetSettingValue.js` | **no edit** (`kindToStateKey` is enough) |
| `bindWidgetSettingsPanel.js` | **do not edit** (208) |
| `imagePaths.js` | **no edit** (basePath only; icon = `definition.icon`) |
| `domQueries.js` ~69–74 | add `KDB_groupingButton` to focus keep-list (else `removeChild`) |
| CSS | `widgetSettings.css` + `widgetVis.css` (focus): hide `.KDB_groupingButton` when `data-kdb-vis-type` is `list`, `prognose`, or either IBM Prognose id. Keep DOM. |

`ensureDropdownSelected` picks first option (`stichtag`) until stamp runs. `placeWidgetSettingsPanel` already stamps after build — grouping mark in that stamp overwrites the first-option default. Do not edit `placeWidgetSettingsPanel.js`.

### 11.4 Stamp `dataConfig.grouping`

Live `buildLocalFilters.js` `resolveKennzahlPack` reads **`dataConfig.grouping`**, not `settings.grouping`. Title already reads `settings.grouping`. Overlay already reads `input.settings.grouping`.

`buildBindingSpec.js` is **149/150**, AMD 5. After the spec object, one line:

`if (grouping === "stichtag" || grouping === "jahr") { spec.dataConfig.grouping = grouping; }`

`mapSettings` still has **no** grouping. Absent / non-token → omit the key (inherit). Do not split this file if the stamp is that one line (150 exactly).

### 11.5 Out of B

C history. D `grp` / Q6. E `vals`. `setFormat`. showValues D2. TopN Stichtag pin. Legend. Toast. `definitions.js` grain keys. New visType buckets. `_KDB.services.grouping`. New `messageService` method.

### 11.6 Canvas B (after JS)

PO certifies Cognos. Captain does not. XOR vis: dropdown **Zeitebene** / Stichtag / Jahr; inherit titles unchanged until click; click flips slots + titelhaakjes; visType switch keeps an explicit grain. List + Prognose: icon in DOM, not visible. No calendar icon on List/Prognose chrome.

---

## 12. Step F — layout-set (Implemented)

PO 2026-09-12. Not C. Not a reopen of A as unfinished. A/B stay `Implemented`. Second-pass army HOLD-WITH-GATES → GO contract.

### 12.1 Tokens and chrome

| Token | Label DE |
|---|---|
| *(absent)* | **Diagrammstandard** (U2 chrome row; chrome key `inherit`, never stored) |
| `stichtag` | Stichtag |
| `jahr` | Jahr |
| `jahrStichtag` | Jahr \| Stichtag |
| `stichtagProJahrH` | Stichtag pro Jahr (H) |
| `stichtagProJahrV` | Stichtag pro Jahr (V) |

Title stays **Zeitebene**. Never `Gruppierung*`. Never store `"default"` / `"none"` / `""` / `diagramm`. Axis Stichtag = **Monat**. Overlay slot tokens = `Jahr` \| `Monat` \| `""` only. Agg member `"Stichtag"` only on `AggregationstypId`. Prognose PKZ dim never on XOR overlays.

**U2:** Diagrammstandard = Family A **inherit** (field **absent**). Chrome row `key`/`value` `inherit` (not `"default"` / `"none"` / `""` / `diagramm`). Selecting it **deletes** `settings.grouping` (+ `groupingMeta`). Do **not** write `null`. Do **not** write `defaultGrain`. Unset chrome **marks Diagrammstandard**, not `defaultGrain`. Inherit row is visible on every vis that shows Zeitebene (not hidden by allowlist). **G:** that row may set `isDefault: true` so it gets the Dimension dashed look. Grain rows stay without `isDefault`.

### 12.2 Allowlists and `defaultGrain`

| Vis | Allowlist | `defaultGrain` |
|---|---|---|
| Line | `stichtag`, `jahr`, `jahrStichtag`, `stichtagProJahrH`, `stichtagProJahrV` | `stichtag` |
| pie | `jahr`, `jahrStichtag`, `stichtagProJahrH`, `stichtagProJahrV` | `jahr` |
| StackedBar / StackedColumn | same as pie | `jahr` |
| List | `jahr`, `jahrStichtag` | `jahrStichtag` |
| Prognose | **empty** | `stichtag` (body only; no chrome) |

### 12.3 visType switch (KEEP-specialize)

KEEP explicit token **iff** the **new** vis allowlists it. Else **CLEAR** (delete key → inherit that vis `defaultGrain`).

Do **not** write the destination `defaultGrain` token (would KEEP on the next switch; Line Stichtag → Stacked → Line would land on Jahr).

Prognose allowlist empty → always CLEAR on enter. Leave Prognose = inherit destination (forget previous).

**No leftover alias.** Stored `"stichtag"` is legal on **Line only**. On pie / Stacked* / List / Prognose it is illegal → inherit (`defaultGrain` / Diagrammstandard). Effective grain, overlay, pack, and stamp CLEAR all use the **stored** token against the destination allowlist — do not remap pie/Stacked `"stichtag"` to `jahrStichtag`.

### 12.4 Slot recipes (clone-from-body; whole-slot write)

Omit = keep body. H↔V is never overlay-on-overlay. Write unused Repeat `""`. Do not copy Line.jahr `{ Monat: null }` onto Stichtag-shaped overlays.

**Line** — `stichtag` = body (no overlay): `categories` Monat string, `series: [Jahr]`, Agg pin, Monat+Jahr exclude.

| Grain | Must write |
|---|---|
| `jahr` | `categories: "Jahr"`, `series: ""`, `widgetFilter: { AggregationstypId: null, Monat: null }` |
| `jahrStichtag` | `categories: ["Jahr","Monat"]`, `series: ""` (keep body filters) |
| `stichtagProJahrH` | `series: ""`, `repeatHorizontal: ["Jahr"]`, `repeatVertical: ""` |
| `stichtagProJahrV` | `series: ""`, `repeatVertical: ["Jahr"]`, `repeatHorizontal: ""` |

**Stacked*** — no `stichtag`. `jahr` = body. Catalog may still hold leftover `grains.stichtag`; overlay is allowlist-gated, so that key is unused. Stored `"stichtag"` CLEARs (§12.3).

| Grain | Must write |
|---|---|
| `jahrStichtag` | `categories: ["Jahr","Monat"]`, both repeats `""`, Agg pin Stichtag + Monat exclude |
| H | `categories: ["Monat"]`, `repeatHorizontal: ["Jahr"]`, `repeatVertical: ""`, same Agg + Monat exclude |
| V | `categories: ["Monat"]`, `repeatVertical: ["Jahr"]`, `repeatHorizontal: ""`, same Agg + Monat exclude |

**pie** — never write `categories` (Dimension owns Segment). `jahr` = body. Leftover `grains.stichtag` unused (same gate as Stacked). Second typed (H) = **V**. Overlay tokens stay `Jahr` \| `Monat` \| `""` only.

| Grain | Must write (Zeit) |
|---|---|
| `jahrStichtag` | `repeatHorizontal: ["Jahr","Monat"]`, `repeatVertical: ""`, Agg pin + Monat exclude |
| H | `repeatHorizontal: ["Jahr"]`, `repeatVertical: ["Monat"]`, Agg pin + Monat exclude |
| V | `repeatHorizontal: ["Monat"]`, `repeatVertical: ["Jahr"]`, Agg pin + Monat exclude |

**Pie + Dienststelle** (PO 2026-09-12 slot-by-grain — Segment-append **withdrawn**): DST is **not** on Segment. Segment = catalog Geschlecht until Dimension switch, then **replace** with the chosen dim (pie force-single). Confirmed DST is **prepended** on one Repeat (first). Overlay tokens stay `Jahr` \| `Monat` \| `""`. See **§14**.

| Grain + DST | Segment | Repeat-H | Repeat-V |
|---|---|---|---|
| `jahr` | dim | Jahr | DST |
| `jahrStichtag` | dim | Jahr, Monat | DST |
| H | dim | DST, Jahr | Monat |
| V | dim | Monat | DST, Jahr |

No DST selected → Segment = dim; Repeats Zeit-only.

**List** — default body = `jahrStichtag` (Jahr+Monat+Kennzahl, pack `list`). `jahr` overlay: `grid_cols: ["Jahr", Kennzahl-placeholder]` (passthrough `[` unique name; no Kennzahl token) + full `slotComposition` replace (`targetIndex: 1` + body hierarchy). No Monat filter to null. Lift List overlay hard-return. Prognose hard-return stays.

### 12.5 Kennzahl pack (no 4th factory pack)

Allowlist **before** pack. Illegal token on that vis → treat as unset (`defaultGrain`).

| Token | XOR vis | List | Prognose |
|---|---|---|---|
| `stichtag` | pack `stichtag` | illegal → default `list` | hard `stichtag` |
| `jahrStichtag` | pack `stichtag` | pack `list` | hard `stichtag` |
| H / V | pack `stichtag` | illegal → default `list` | hard `stichtag` |
| `jahr` | pack `jahr` | pack `jahr` | hard `stichtag` |
| unset | `defaultGrain` then this table | `list` | `stichtag` |

Both `resolveKennzahlPack`s (identity + planner local) + `resolveEffectiveGrain` + `dataConfig.grouping` stamp must share this token set. Title = factory of **applied pack**, not the dropdown label. Line+`jahr` → `(Monatsdurchschnitt)` stays. Title-delta §3/§5 amend with F (not pointer-only).

### 12.6 Chrome / delete / caps

- One `options.js` catalog (inherit first, then the five grain rows). Filter grain rows by allowlist on **stamp** (and visType switch). Never hide `inherit`.
- List CSS unhide grouping (Prognose hide stays).
- Inherit row **Diagrammstandard** locked. `commitWidgetSettingValue` **deletes** grouping when value is `inherit`. `handleApplySetting` omits `settings.grouping` on inherit click (do not copy leftover token).
- `commitWidgetSettingValue` today assigns `null`. F needs a real **delete-key** (snapshot must drop the key; do not keep-on-nullish). Shared file; grouping-delta owns the change. Not a new family.
- Token gates: in-place OR expand on 150-wall files (**no new import** on `buildBindingSpec.js` / snapshot). Optional `isExplicitGrain` **inside** identity only.
- Apply stays data-only (P2). No P3 occupancy. No `_KDB.services.grouping`. No new visType buckets. No `sorting.js` / `KDB.js` / `bindWidgetSettingsPanel.js` / TopN pin / toast / `grp`.
- `P_ABS_K_KF_02` extraFilter Jahr `2025` stays raw.
- Dashboard Jahr still slices Repeat panes.

### 12.7 Out of F

C history. D `grp` / Q6. E `vals`. Pie+DST **Implemented**. Third family. Seed grouping.

### 12.8 Canvas F (after JS)

PO certifies Cognos. Captain does not. Per-visType option lists; illegal token CLEARs; Line Jahr\|Stichtag = dual x, no series-Jahr; H/V = Jahr on one Repeat only; List Jahr vs dual; Prognose no icon; title follows pack.

PO canvas **green** 2026-09-12. Step F `Implemented`.

---

## 13. Step D — writeback GET/SET `grp` (Implemented)

PO **Q6-A** 2026-09-12. Not C. Not E. Not pie+DST. Not a reopen of A/B/F/G+H. List **is** in D (F supersedes A “List excepted from writeback”).

**Q6-A:** GET omits `grp` when grouping is inherit (field absent). Persist an explicit F grain even when it equals that vis `defaultGrain`. SET missing → leave absent. Never `commitRequiredSetting`. Q6-B (omit-equals-`defaultGrain`) is **rejected**.

F CLEAR on GET/SET is **not** Q6-B: omit/CLEAR a token the **current** `type` would reject (Prognose `stichtag` equals `defaultGrain` but allowlist is empty).

### 13.1 Product

| Topic | Decision |
|---|---|
| Key | `wgts[].grp` (≤5, **not** `dim`). Values = F five tokens (`stichtag` · `jahr` · `jahrStichtag` · `stichtagProJahrH` · `stichtagProJahrV`). Never store `"inherit"` / `null` / `defaultGrain` / `"none"` / `""`. |
| Schema | `SCHEMA_VERSION` stays **3**. Unknown `grp` today is correctly `WRITEBACK_INVALID_V3_PAYLOAD` until catalogued. |
| GET inherit | Omit. |
| GET explicit legal | Emit `grp: "<token>"` even if token === that vis `defaultGrain`. |
| GET illegal-for-`type` | Omit (do not freeze leftover). **Intended lossy:** a leftover that would KEEP on a *later* vis (List/pie `stichtag` → Line) becomes inherit after GET→SET. Same §12.2 allowlist as stamp. Resolve from this widget’s `type` via existing normalize/bucket — do **not** compare raw `"list"` vs `"List"`. |
| SET missing | Leave `settings.grouping` absent. |
| SET legal | `hasOwnProperty` → `commitDirect` the grain token. |
| SET illegal-for-`type` | **CLEAR on the record** (leave absent). Prognose any token; `stichtag` on List; H/V on List; any five-token not on that vis allowlist. Do **not** KEEP. Do **not** `commitDirect` the destination `defaultGrain` (faux-CLEAR would KEEP on the next legal vis). Do **not** wait for `stampPanelVisType` (no panel on share / read-only / `hidWs`). No diagnostic required. |
| Validate | Closed five-token special-case (like `vals` 0\|1). `"inherit"` / junk → field invalid. Per-vis allowlist in **schema** = overdesign. Do not `WRITEBACK_INVALID` the whole payload for illegal-for-`type`. |
| Restore order | After `vals`, before stamp. Do not touch `showValues`. |
| `groupingMeta` | **Not** a v3 field. Delete-with-key stays live-only. |
| v2 map | Omit `grp` (same as `vals`). Do not invent a v2 grain source. |
| `newDashboard` | Inherit. No seed. |
| Homonyms | Grain only on `grp`. Never write grain onto `dim`. Never write Aggregationstyp caption `"Stichtag"` onto `grp`. |

### 13.2 GET

Mirror `vals` emit shape, not `assignOptionalString` (omit-equals-default = Q6-B).

Emit when **all** hold:

1. `settings.grouping` is one of the five F tokens (not `typeof === "string"`).
2. That token is allowlisted for this widget’s vis `type` after **identity** resolve (below).

Otherwise omit. Prognose never emits.

**GET type→bucket (normative). Do not copy stamp `SETTINGS_VIS_KEYS`.** That map keeps `list` / `stackedbar` / short Prognose ids off the grain buckets; unknown then behaves like Line-open and can **emit `stichtag`**. Copy the two identity tables, not stamp keys, not raw §12.2 titles.

1. Alias (same as `normalizeVisualizationType`): `line→Line`, `pie→Pie`, `stackedbar→StackedBar`, `stackedcolumn→StackedColumn`, `list→List`, `prognose` / both IBM Prognose ids → `Prognose`. Compare `toLowerCase()` of the GET `type`.
2. Bucket (same as `visualizationTypeToBucket`): `Line→Line`, `StackedBar→StackedBar`, `StackedColumn→StackedColumn`, `Pie`/`pie→pie`, `List→List`, `Prognose` / both IBM ids → `com.ibm.vis.custom.prognoseyearlinechart`.
3. Allow (same as `isAllowedGrain`): `List` = `jahr` \| `jahrStichtag`; Prognose bucket = **never**; pie/Stacked* = five minus `stichtag`; `Line` = all five.

Collect has no `_KDB`. Do not import the AMD-9 binding barrel into `buildWidgetObject.js`. Inline those three maps in `buildWidgetObject.js` (not `v3Defaults.js`). Stay ≤150; if the file would exceed 150, **stop** — do not invent a helper. **No** same-folder helper (Family A: helper only at a third control).

### 13.3 SET / restore

Catalog `grp` together: `WIDGET_FIELDS.vis`, `VIS_KEYS`, `commitVisAndConsequences`, consumed-keys table.

| Present `grp` | Action |
|---|---|
| Missing | No commit. Grouping stays absent. |
| Five-token + allowlisted for entry `type` | `commitDirect("grouping", token)`. |
| Five-token + **not** allowlisted | Leave absent (CLEAR). Do not `commitDirect`. Do **not** `commitDirect` `defaultGrain`. |
| Not a five-token | Validate already failed; do not commit. |

SET has `_KDB`. Allow = `resolveVisPropBucketKey(type, _KDB)` + the same `isAllowedGrain` predicate as GET §13.2 step 3. **Do not** use `resolveEffectiveGrain === token` — Prognose `defaultGrain` is `stichtag` with an empty allowlist, so that equality would KEEP illegal `stichtag`. `isAllowedGrain` is not a barrel export; inline those few lines (or call `resolveVisPropBucketKey` + local predicate). Do **not** use stamp `SETTINGS_VIS_KEYS`.

CLEAR = leave `grouping` absent (delete key + `groupingMeta` if present). Never `commitRequiredSetting`. Never `commitDirect` `defaultGrain`. Do **not** edit `stampPanelVisType.js` / F CLEAR / `commitWidgetSettingValue.js` / omission sentinels (do not add `"inherit"`). Snapshot already copies the five tokens (`buildWidgetVisSettingsSnapshot.js` **149** — do not edit).

### 13.4 Validate + normalize

- `WIDGET_FIELDS.vis.grp`: `{ type: "string", required: false }`.
- `validateWidgetFields.js`: `fieldName === "grp"` must be one of the five tokens (vals-shaped special-case).
- Existing optional omit: `null` / `""` / `"none"` / `"default"` → drop key. `"inherit"` is **not** that sentinel — reject.
- Illegal-for-`type` is still a valid **field** value; CLEAR is SET (§13.3).

### 13.5 Likely files (not chrome)

`buildWidgetObject.js`, `v3Defaults.js`, `validateWidgetFields.js`, `handleParameterSetRestoreBatch.js` (`VIS_KEYS`), `parameterSetRestoreBatchCommits.js`. Room under 150 / AMD 10. Copy `vals` locally; no Family A helper.

**Do not edit:** `bindWidgetSettingsPanel.js`, `KDB.js`, `sorting.js`, `buildWidgetVisSettingsSnapshot.js`, `handleApplySetting.js`, `applyVisualizationProperties.js`, `stampPanelVisType.js`, `commitWidgetSettingValue.js`, omission-sentinel helper, overlay / `bindingSpecsGrain.js`, `dropdownDefaults` / `VIS_STARTUP_KINDS`, `mapV2VisWidget.js` (omit by doing nothing).

### 13.6 Out of D

C history. E (`grp` vs `vals`; do not redesign `vals`; `setFormat` is not E). Pie+DST **Implemented**. Toast. Third family. Seed. Decimals.

**E note:** `vals` KEEP-all-vis; `grp` KEEP-specialize. Document, do not unify.

### 13.7 Canvas D (after JS — PO only)

Captain does not certify Cognos.

1. Unset vis: GET omits `grp`; SET missing → Diagrammstandard.
2. Line click **Stichtag**: GET `grp: "stichtag"`; SET chrome **Stichtag** (not Diagrammstandard).
3. Pie click **Jahr**: GET `grp: "jahr"`; SET then switch Line → **Jahr** KEEP.
4. List click **Jahr \| Stichtag**: GET `grp: "jahrStichtag"`; SET then switch XOR → KEEP.
5. Prognose: GET omits; SET present `grp` → inherit, not KEEP. Must **not** write `stichtag` into settings.
6. SET `grp: "stichtag"` on List → CLEAR / inherit (effective List `jahrStichtag`). Must **not** write `jahrStichtag`.
7. SET leftover pie `stichtag`, or H/V on List → GET omit; SET CLEAR / inherit. Same faux-CLEAR ban.
8. Same widget still round-trips `vals`. v2 / `newDashboard` → inherit grouping.

### 13.8 Parent patches (after Approved — not JS)

| Parent | Patch |
|---|---|
| `writeback.md` §4.5 vis shape | Add `grp?` on the vis object next to `vals?`. Own sentence (do not fold into the `vals` sentence): vis `grp` is explicit grouping grain; omit when inherit; omit when the token is illegal for this `type`; present token is one of the five F grains, including equal-to-`defaultGrain`. Also rewrite the generic “omitted optional key = owner default” / “cannot be derived from defaults” line so it does **not** swallow `grp` (that sentence is Q6-B-shaped). |
| `writeback.md` §4.5.1 map | New row `grp` \| explicit grouping grain, optional \| not allowed on txt. |
| `writeback.md` §4.5.1 omit sentence | **Rewrite, do not splice.** Keep “omit when the owner default applies” for Family B only (`dim`/`topn` "none", colours, `fsize`, `style`). `vals` stays a **separate** Family A clause (omit inherit; present `0` is explicit). Add a **third** clause for `grp`: omit inherit **or** illegal-for-`type`; present equal-to-`defaultGrain` is explicit. Never list `grp` inside the Family B parenthesis. |
| `writeback.md` §4.7 | Row `wgts[].grp` \| F grain string \| widgetSettings `grouping` \| omit inherit **or** illegal-for-`type` \| `"inherit"` / junk fail validation. |
| `writeback.md` §6.6.1 step 25 | Add `grp` to the `"vis"` payload-subset keys: `type`, `dim`, `topn`, `vals`, `grp`, `ctcol`. |
| `widgetSettings-parameterSetRestore-contractdelta.md` §2 | `grp` → `grouping`; omitted → inherit; present illegal-for-`type` → leave absent. |
| `widgetSettings-parameterSetRestore-contractdelta.md` §4 | Do **not** add `grp` to the Family B sentinels table. |
| `widgetSettings-setting-family-contractdelta.md` §3.1 GET | Close the “grouping Q6 is not decided here” hedge: grouping is Q6-A (omit inherit; persist explicit equal-to-`defaultGrain`). |

Applied 2026-09-12 with D `Approved`.

---

## 14. Pie + Dienststelle (slot-by-grain) — Implemented

PO opened 2026-09-12 after D canvas item 7. Same-day: Monat-slot withdrawn, then Segment-append withdrawn. **This lock:** DST not on Segment; Repeat home **varies by grain**. Not C. Not E. Not toast. Not a reopen of A/B/F/G+H/D. Stacked* / Line / List / Prognose DST order **unchanged**.

D item 7 RED was **not** a `grp` miss. F H/V writes pie Repeat-V; a leftover wipe then replaced that slot with Dienststelle for every grain. Overlay Zeit was already correct. A blanket Repeat-V wipe is **wrong** for H (Monat lives there; DST must go to Repeat-H).

### 14.1 Product (locked)

- Segment = **Dimension** only. Default catalog Geschlecht. Dimension switch **replaces** Geschlecht. No DST on Segment.
- Confirmed DST is **prepended** (first) on one Repeat. Empty Repeat → `[DST]`. Repeat with Jahr → `[DST, Jahr]`.
- Overlay catalog stays Zeit tokens only. DST is planner-injected when `hierarchySnapshot.resolution.hasConfirmedSelection === true`.
- No DST / no confirmed selection → Segment = dim; Repeats Zeit-only.

| Grain | DST Repeat |
|---|---|
| `jahr` | Repeat-V |
| `jahrStichtag` | Repeat-V |
| H | Repeat-H |
| V | Repeat-V |

Worked slots: §12.4 table.

### 14.2 Mechanism (no new mode; no blanket wipe)

Reuse `slotComposition.hierarchy.mode: "insertBeforeSelectedDimensionOrBeforeLast"`. Pie Repeats do not carry `selectedDimensionId` → empty → `[DST]`; `[Jahr]` → `[DST, Jahr]`.

| Source | `slotComposition` |
|---|---|
| pie body (`jahr`) | `repeatVertical.hierarchy` that mode |
| `jahrStichtag` + leftover `stichtag` | explicit Repeat-V policy (same as body; inherit would also work) |
| H | **whole-replace** → Repeat-H policy only (body Repeat-V policy must not linger — would put DST before Monat) |
| V | explicit Repeat-V policy (body inherit would also work) |

`applyGrainOverlayOnClone` already assigns `slotComposition`. **Do not edit** that file or `applySlotComposition.js`.

### 14.3 Planner

1. Repeat-V wipe (`isPieVis && repeatVertical` → `[hierarchyId]`) — **must stay deleted**.
2. No-policy append on pie `categories` — **skip for pie** (`!isPieVis &&` on that fallback).
3. Keep pie force-single on `categories` (`[dim]` only).
4. **Empty Repeat is still a DST home.** `collectActiveSlotNames` today treats `""` / `[]` as inactive, so pie `jahr` / `jahrStichtag` Repeat-V is never resolved. DST then only hits `buildHierarchyFilter` → Lokale Filter (PO canvas RED). A slot is **also active** when `slotComposition[slotName].hierarchy` exists, even if the raw slot value is empty. No confirmed DST → resolve stays `[]` → optional skip (existing warning). Do **not** restore the wipe. Do **not** suppress `buildHierarchyFilter` in this WP (Cognos shows Einbezogen on the bound Repeat).

Do not grow `resolveSlotColumnIds` `__controller`. Do not edit grain / visTypes this wave (policies already correct).

### 14.4 Out of this WP

C, E, toast PROGRAM, writeback `grp`, chrome / Zeitebene, `sorting.js`, `KDB.js`, `bindWidgetSettingsPanel.js`, legend collapse, Stacked/Line/List/Prognose `slotComposition`, new `insertHierarchyId` mode, overlay helper edit, seed.

### 14.5 Parent patches

| Parent | Patch |
|---|---|
| `widgetBindingPlan.md` §5.1 pie carve | DST not on pie `categories`. Prepend on Repeat-V for `jahr` / `jahrStichtag` / V; Repeat-H for H. No wholesale Repeat-V wipe. |
| `widgetBindingPlan.md` `buildSlots` / slot activity | A slot is also planned when `slotComposition[slotName].hierarchy` exists, even if the raw slot value is empty (`""` / `[]`). |

Applied with this Draft.

### 14.6 Canvas (PO Cognos only)

Captain does not certify.

1. `jahr` + DST: Segment = dim only; Repeat-H = Jahr; Repeat-V = Dienststelle.
2. Dimension switch: Segment = chosen dim, still no DST.
3. `jahrStichtag` + DST: Repeat-H = Jahr, Monat; Repeat-V = Dienststelle; Segment = dim.
4. H + DST: Repeat-H = Dienststelle, Jahr; Repeat-V = Monat; Segment = dim.
5. V + DST: Repeat-H = Monat; Repeat-V = Dienststelle, Jahr; Segment = dim.
6. DST off: Repeats Zeit-only; Segment = dim.
7. Line / Stacked / List DST order unchanged.

---

## 15. Step E — `grp` vs `vals` (Implemented)

PO opened 2026-09-12. Not C. Not toast. Not `setFormat` / decimals. Not a reopen of A/B/F/G+H/D/pie+DST. **No JS.** Do **not** redesign `vals`. Do **not** unify KEEP.

D already shipped `grp` next to `vals` (Q6-A + illegal-for-`type` CLEAR). E is the comparison that D parked: both are Family A; they are **not** the same KEEP machine.

### 15.1 Same (leave)

| Concern | `vals` (`showValues`) | `grp` (`grouping`) |
|---|---|---|
| Family | A — inherit = field **absent** | A — inherit = field **absent** |
| Chrome inherit | Diagrammstandard; key `inherit` never stored; click **deletes** | same |
| GET inherit | Omit | Omit |
| GET explicit = catalog / `defaultGrain` | Persist (`vals: 0` on hide-catalog type) | Persist (Q6-A) |
| SET missing | Leave absent | Leave absent |
| SET present legal | `commitDirect` boolean | `commitDirect` grain token |
| Restore order | After `type` / `dim` / `topn` required commits; before stamp | Immediately after `vals`; before stamp |
| v2 / `newDashboard` | Omit → inherit | Omit → inherit |
| Schema | optional; `SCHEMA_VERSION` 3 | optional; `SCHEMA_VERSION` 3 |
| Family A helper | None (copy locally) | None (copy locally) |
| Seed / `VIS_STARTUP_KINDS` | Not seeded | Not seeded |

### 15.2 Different (intentional — do not unify)

| Concern | `vals` | `grp` |
|---|---|---|
| visType switch | **KEEP-all-vis.** Explicit boolean survives every type, including List and Prognose. Stamp does **not** delete `showValues`. | **KEEP-specialize.** KEEP iff the **new** vis allowlists the token; else delete → inherit destination `defaultGrain`. Live stamp CLEAR (`stampPanelVisType`) runs when a panel is mounted. GET/SET already omit/CLEAR illegal-for-`type` without stamp (share / read-only / `hidWs`). |
| GET extra omit | None | Omit illegal-for-current-`type` (same allowlist as stamp). Intended lossy leftover. |
| SET illegal present | Always `commitDirect` `0\|1` (List included — no SET List gate) | Leave absent (do not `commitDirect` destination `defaultGrain` — faux-CLEAR). |
| Payload type | number `0\|1` | string; one of the five F tokens |
| Validate | `0` or `1` | five tokens; `"inherit"` fails |
| List chrome | Icon CSS-hidden; state kept | Icon visible; allowlist `jahr` \| `jahrStichtag` |
| Prognose chrome | Visible; inherit = hidden; explicit Anzeigen allowed | Hidden; allowlist **empty** → GET never emits; SET present CLEAR |
| Effective inherit | Current vis catalog show/hide (List: no label keys) | Current vis `defaultGrain` |
| Apply | Overlay boolean on non-List; List skips Cognos label writes | Grain overlay + pack (F) |

`writeback.md` §4.5.1 already has **two** Family A omit clauses (do not fold `grp` into the `vals` sentence). Family-gate §3.1 “Explicit → KEEP” is the **showValues** machine. Grouping is the approved specialize exception (F §12.3), not a third family.

### 15.3 Live files (read-only this WP)

`buildWidgetObject.js` (`vals` = typeof boolean; `grp` = grain ∩ allowlist). `v3Defaults.js` (`number` vs `string`). `validateWidgetFields.js` (0\|1 vs five tokens). `parameterSetRestoreBatchCommits.js` (`hasOwnProperty` vals always; grp + `isAllowedGrain`). `stampPanelVisType.js` (grouping CLEAR only). `handleApplySetting.js` (copy both when explicit).

### 15.4 Out of E

C history. Toast. `setFormat` / decimals. Family A helper. Unify KEEP. Change `vals` GET/SET. Change `grp` Q6-A. Third family. Seed.

### 15.5 Parent patches (after Approved — not JS)

| Parent | Patch |
|---|---|
| `widgetSettings-setting-family-contractdelta.md` §3.1 visType-switch row | After “Explicit → KEEP”: showValues is KEEP-all-vis. Grouping is KEEP-specialize (allowlist / CLEAR). Pointer: grouping-delta **§15**. Do not rewrite the Family A gate. |
| `widgetVis-show-values-contractdelta.md` | One sentence in D2 / persist: `vals` KEEP-all-vis is unchanged; grouping KEEP-specialize lives in grouping-delta §15. Do not reopen D2. |

### 15.6 Canvas (PO — no Cognos)

Captain does not certify. Confirm the §15.2 table. No widget retest required unless PO wants a smoke: explicit `vals` survives Line→List→Line; explicit illegal `grp` CLEARs on visType switch.

PO confirm 2026-09-12. Step E `Implemented`.

---

## 16. Step C — undo/redo Zeitebene (Implemented)

PO opened 2026-09-12 after E. Not toast. Not `setFormat`. Not a reopen of A/B/F/G+H/D/E/pie+DST. **No new history key.** Reuse `widgetSettings_optionSelect`. **No JS** unless canvas finds a hole (static path already rides the generic dropdown machine from B/F/G).

### 16.1 Product (locked)

- Zeitebene click (grain or Diagrammstandard) is a settings dropdown step on the **same** stack as visType / dimension / Werte anzeigen.
- Undo/redo **this** control restores that click: token ↔ token, or token ↔ inherit (field absent + Diagrammstandard).
- First grain click from unset: undo returns to inherit (not a leftover explicit token). Same first-click package as showValues H.
- Inherit click deletes `grouping` (+ `groupingMeta`) and full-rebinds (`reason: "grouping"`). Replay uses the same apply path.
- Allowlist may `display:none` illegal rows; nodes stay in DOM so replay can still find them. Inherit row is never hidden.
- **VisType undo does not restore a CLEARED grain.** visType history is visType-only. KEEP-specialize CLEAR deletes the record on the visType commit; undo visType replays the old type against the **already cleared** record → inherit destination `defaultGrain`. Do **not** pack grouping into the visType frame.
- KEEP is not restore: a token that stayed legal never left the record, so undo visType still shows it.

### 16.2 Live path (read-only)

`bindWidgetSettingsPanel` (push after confirmed apply; skip only `backgroundColor`) → `widgetSettings_optionSelect` → `applyWidgetSettingsOptionHistoryReplay` → `dropdownOption` `isHistoryReplay: true` → `widgetVis/applyGrouping` → `handleApplySetting` (token copy / inherit delete) → `runBindingPipeline` → `finalizeVisIntentResult` generic vis commit. Do **not** edit `bindWidgetSettingsPanel.js`. No `handleApplyGrouping.js`. No third safeguard.

### 16.3 Out of C

Toast. New history key. Restore grain on visType undo. Pack grouping into visType frames. `setFormat`. Family A helper. Seed.

### 16.4 Parent patches

None unless canvas forces JS. `historyService.md` already: no new key.

### 16.5 Canvas (PO Cognos only)

Captain does not certify.

1. Line unset (Diagrammstandard). Click **Jahr**. Undo → Diagrammstandard, default Stichtag slots/title, GET omits `grp`. Redo → explicit Jahr, GET `grp: "jahr"`.
2. Line + explicit Jahr. Click **Diagrammstandard**. Undo → Jahr + rebind. Redo → inherit again.
3. Line: undo/redo **each** grain on its own (history stack is 5 — one chain of all five can drop the oldest). Pie: the four legal tokens (not Stichtag). List: `jahr` and `jahrStichtag` only.
4. **CLEAR proof — do not start from Line + explicit `stichtag`.** After CLEAR, Line inherit and Line + explicit Stichtag are the same slots/title; only chrome (Diagrammstandard vs Stichtag) + GET omit vs `grp: "stichtag"` tell them apart. **Primary:** pie + **Stichtag pro Jahr (H)** → List → **one visType undo** (do not also undo the H click) → pie **Diagrammstandard** (not Jahr selected) / Jahr body (not H). GET omits `grp`. **Alternate:** Line + **Jahr \| Stichtag** (`jahrStichtag`) → Prognose → one visType undo → Line **Diagrammstandard** (not Stichtag selected) / Stichtag-only body (not dual). GET omits `grp`. If chrome says Diagrammstandard but GET still has `grp`, that is faux-CLEAR — RED.
5. **KEEP is not restore.** Line + explicit Jahr → pie → undo visType → Line still Jahr.
6. Same undo stack as the other settings dropdowns. No extra history control.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-11 | A shape locked in chat | PO vastenburg | Sibling `grainByBucket`; one body + non-default whole-slot overlay; two grains on Line/pie/Stacked*; List omit; Prognose `defaultGrain` only |
| 2026-09-11 | `Draft` contract text | captain | Title-delta §2/§3/§5/§6 amended as pending-A. No JS. |
| 2026-09-11 | Draft NIT pass 1 | captain | Sibling-home rationale; expand-before-sort; Monat-short 23+2. Title-delta vector 7 + StackedColumn do-not. |
| 2026-09-11 | Draft NIT pass 2 | captain | List excepted = XOR/chrome/writeback, not pack rename. Title §7/§8 scoped. |
| 2026-09-11 | `Draft` → `Approved` | PO vastenburg | Dual review OK/OK. A config + same-day readers. B–E still reserved. |
| 2026-09-11 | `Approved` → `Implementing` | captain (army W1–W3) | Dual JS review NIT/NIT. B must stamp `dataConfig.grouping`. Await PO canvas. |
| 2026-09-11 evening | `Implementing` → `Implemented` (Step A) | PO vastenburg | Cognos inherit titelhaakjes green. No B chrome yet. |
| 2026-09-11 evening | Step B `Draft` | captain; PO title | Chrome + `dataConfig.grouping` stamp. Title **Zeitebene**. Options `Stichtag` / `Jahr` pending lock. No JS. |
| 2026-09-11 evening | B dual review r1 GREEN/GREEN | army | NITs folded: ariaLabel; invert showValues early-return; snapshot extend existing helper; apply one-liners; canonical no-edit. |
| 2026-09-11 evening | Dual r2 + r3 GREEN/GREEN | army | r3 NIT: startup skip grouping; stamp barrel path spelled. |
| 2026-09-11 evening | Step B `Draft` → `Approved` | captain (PO: auto-approve on 3× green) | Zeitebene / Stichtag / Jahr locked. Q6 still D. JS next. |
| 2026-09-11 evening | Step B `Approved` → `Implementing` | captain; army W1–W3 | Dual JS GREEN/GREEN. Await PO canvas B. |
| 2026-09-11 night | Monat-hole **P2 locked**; §4.2 / §4.3 / §4.4 amend | PO vastenburg; captain | Line.jahr `Monat: null`; apply expands `Monat`/`Jahr` localfilter KIDs before merge. B stays `Implementing`. No unique names in grain. |
| 2026-09-12 | Step B `Implementing` → `Implemented` | PO vastenburg | Canvas stap 2 groen (Line→Jahr data zonder Monat handmatig weg). Hole spec Executed. C–E still reserved. |
| 2026-09-12 night | Step F `Approved` | PO vastenburg; captain | 5 tokens + inherit-delete; KEEP-specialize CLEAR; axis Stichtag=Monat; pie 2nd H=V; List default `jahrStichtag`; DST-V later; label TBD. Second-pass HOLD-WITH-GATES. |
| 2026-09-12 night | F U2 copy lock | PO vastenburg | Chrome **Diagrammstandard**; key `inherit` never stored. Unset marks that row. F2 JS next. |
| 2026-09-12 night | F CLEAR simple | PO vastenburg | Illegal token on next vis → inherit. No B `stichtag`→`jahrStichtag` alias. |
| 2026-09-12 | Step F `Approved` → `Implemented` | PO vastenburg | Cognos canvas green. Spec Executed. C–E still reserved. Q6 still D. |
| 2026-09-12 | Step G Draft (look only) | PO vastenburg; captain | Inherit `isDefault` via family-a-inherit-row-chrome. F product unchanged. |
| 2026-09-12 | Q6-A locked | PO vastenburg | Omit `grp` when inherit only. Q6-B rejected. |
| 2026-09-12 | Step D `Draft` | captain | §13 GET/SET `grp`. Parent patches listed, not applied. No JS. |
| 2026-09-12 | D Draft NIT fold | captain | §13.8: rewrite §4.5.1 omit (no splice into Family B); add §6.6.1 step 25 `grp`. |
| 2026-09-12 | D Draft NIT fold | captain | §13.2: no same-folder GET helper (family: helper only at third A control). |
| 2026-09-12 | D Draft NIT fold | captain | §13.1/§13.3/§13.7: intended lossy leftover; faux-CLEAR ban; canvas pie leftover + H/V on List. |
| 2026-09-12 | D Draft NIT fold | captain | §13.2: allowlist inline in `buildWidgetObject.js`, not `v3Defaults.js`. |
| 2026-09-12 | D Draft FAIL fold | captain | §13.2: GET copies identity alias+bucket+`isAllowedGrain`, not stamp `SETTINGS_VIS_KEYS`. SET uses identity helpers. `grp` after `vals`. |
| 2026-09-12 | D Draft FAIL fold | captain | §13.3: SET allow = bucket + `isAllowedGrain`, not `resolveEffectiveGrain === token`. |
| 2026-09-12 | Step D `Draft` → `Approved` | PO auto (second-pass all-green) | Q6-A. Parent patches applied. Spec + JS next. |
| 2026-09-12 | Step D `Approved` → `Implementing` | captain | Execution spec Ready. Five exclusive writers. |
| 2026-09-12 | D JS dual GREEN/GREEN | captain | Spec Executed. Await PO canvas. |
| 2026-09-12 | Step D `Implementing` → `Implemented` | PO vastenburg | Canvas 1–6, 8 green. Item 7 = pie+DST Repeat (planner leftover), not `grp`. |
| 2026-09-12 | pie+DST `Draft` | PO vastenburg; captain | DST joins Monat-slot before Monat; Segment = Dimension (default Geschlecht). Not always Repeat-V. |
| 2026-09-12 | pie+DST `Draft` → `Approved` | PO auto (dual contract GREEN/GREEN) | Parent `widgetBindingPlan.md` §5.1 pie carve applied. Spec Ready. JS next. |
| 2026-09-12 | pie+DST `Approved` → `Implementing` | captain | Three exclusive writers. Dual JS GREEN/GREEN. Await PO canvas. |
| 2026-09-12 | pie+DST PO correct → `Draft` | PO vastenburg | Monat-slot withdrawn. DST on Segment `[dim, DST]`; Repeats Zeit-only. Wipe stays deleted. |
| 2026-09-12 | pie+DST `Draft` → `Approved` (correct) | PO auto (dual contract GREEN/GREEN) | Parent §5.1 carve rewritten. Spec Ready. JS revert wave. |
| 2026-09-12 | pie+DST `Approved` → `Implementing` (correct) | captain | Revert wave landed. Dual JS GREEN/GREEN. Await PO canvas. |
| 2026-09-12 | pie+DST slot-by-grain → `Draft` | PO vastenburg | DST not on Segment. `jahr` / `jahrStichtag` / V → Repeat-V; H → Repeat-H. DST prepended. |
| 2026-09-12 | pie+DST `Draft` → `Approved` (slot-by-grain) | PO auto (dual contract GREEN/GREEN) | Spec Ready. JS next. |
| 2026-09-12 | pie+DST `Approved` → `Implementing` (slot-by-grain) | captain | Dual JS GREEN/GREEN. Await PO canvas. |
| 2026-09-12 | pie+DST empty Repeat-V hole → `Draft` | PO vastenburg | `jahr` / `jahrStichtag` DST in Lokale Filter. Slot with hierarchy policy is active even when raw is empty. |
| 2026-09-12 | pie+DST `Draft` → `Approved` (empty Repeat) | PO auto (dual contract GREEN/GREEN) | Spec Ready. W-ACTIVITY only. |
| 2026-09-12 | pie+DST `Approved` → `Implementing` (empty Repeat) | captain | slotActivity.js. Dual JS GREEN/GREEN. Await PO canvas. |
| 2026-09-12 | pie+DST `Implementing` → `Implemented` | PO vastenburg | Canvas green. Slot-by-grain + empty Repeat-V collected. |
| 2026-09-12 | Step E `Draft` | captain | §15 `grp` vs `vals`. No JS. Do not unify KEEP. |
| 2026-09-12 | Step E `Draft` → `Approved` | PO auto (dual contract GREEN/GREEN) | Parent family + showValues KEEP sentences applied. Await PO confirm. |
| 2026-09-12 | Step E `Approved` → `Implemented` | PO vastenburg | Docs-only confirm. No JS. C next. |
| 2026-09-12 | Step C `Draft` | captain | Undo/redo already rides `widgetSettings_optionSelect`. No JS unless canvas hole. |
| 2026-09-12 | Step C canvas §16.5.4 tighten | captain | Primary CLEAR = pie H → List. GET omit required. No Line+`stichtag` start. |
| 2026-09-12 | Step C `Draft` → `Approved` | PO auto (dual contract GREEN/GREEN) | No JS. Await PO Cognos canvas §16.5. |
| 2026-09-12 | Step C `Approved` → `Implemented` | PO vastenburg | Undo/redo canvas green. No JS. |
| 2026-09-12 | Public GET/SET `grp` army | captain | WBParameterGet/Set already Q6-A five-token. No new theme. |
| 2026-09-12 | Closing hygiene army | captain | No JS FAIL. §11 two-token rows marked F-superseded. |
