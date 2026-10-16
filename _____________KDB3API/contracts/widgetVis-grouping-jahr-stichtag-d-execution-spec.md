# Execution Spec: vis grouping — Step D (`grp` / Q6-A)

> Mechanical spec for grok 4.6 army. Architecture: `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` **§13** (**Approved**). Parent patches already applied.
> Echo Section A **before** producing files. Do not stamp D `Implemented`. Do not start C/E/pie+DST.

---

**Status:** `Executed` — PO canvas green 2026-09-12. Grouping-delta §13 `Implemented`. Public `WBParameterGetFunction` / `WBParameterSetFunction` already carry `grp` (army 2026-09-12).
**Module / contract:** grouping-delta §13
**Phase:** `extension` (writeback GET/SET `grp`)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-12
**Executing AI:** grok 4.6 army
**Reviewer:** captain + dual grok 4.6 review

---

## Waves

Five exclusive writers, **all parallel**. No shared files.

## Exclusive allowlists

### W-GET

**May edit:** `KDB3/js/core/services/writeback/get/collectors/buildWidgetObject.js`

**Must not:** schema, validate, restore, map, chrome, snapshot.

### W-SCHEMA

**May edit:** `KDB3/js/core/services/writeback/schema/v3Defaults.js`

**Must not:** GET, validate, restore. **No** allowlist table in this file.

### W-VAL

**May edit:** `KDB3/js/core/services/writeback/schema/validate/validateWidgetFields.js`

**Must not:** GET, schema catalog, restore. No per-vis allowlist in schema.

### W-KEYS

**May edit:** `KDB3/js/dashboard/widgets/widgetSettings/actions/handleParameterSetRestoreBatch.js`

**Must not:** commits file, GET, schema.

### W-COMMIT

**May edit:** `KDB3/js/dashboard/widgets/widgetSettings/actions/parameterSetRestoreBatchCommits.js`

**Must not:** `VIS_KEYS` file, GET, stamp, `commitWidgetSettingValue.js`.

### Nobody

`bindWidgetSettingsPanel.js`, `KDB.js`, `sorting.js`, `buildWidgetVisSettingsSnapshot.js`, `handleApplySetting.js`, `applyVisualizationProperties.js`, `stampPanelVisType.js`, `commitWidgetSettingValue.js`, omission-sentinel helper, overlay / `bindingSpecsGrain.js`, `dropdownDefaults` / `VIS_STARTUP_KINDS`, `mapV2VisWidget.js`, `.mdc`, contracts (captain).

---

## Section A. Pre-flight

Read in order; echo **one sentence** each. Do not paste rule bodies.

1–11. The 10 MUST `.mdc` + `cognos-adapter.mdc`
12. `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` **§13** + **§12.2**
13. This spec

Also echo: Q6-A omit inherit only; persist explicit `defaultGrain`. GET copies identity alias + `visualizationTypeToBucket` + `isAllowedGrain` — **not** stamp `SETTINGS_VIS_KEYS`. SET allow = `resolveVisPropBucketKey` + same `isAllowedGrain`; **never** `resolveEffectiveGrain === token`. CLEAR = leave absent; never `commitDirect` `defaultGrain`. No Family A helper. `SCHEMA_VERSION` 3.

---

## Section B. Files

```
KDB3/js/core/services/writeback/get/collectors/buildWidgetObject.js
KDB3/js/core/services/writeback/schema/v3Defaults.js
KDB3/js/core/services/writeback/schema/validate/validateWidgetFields.js
KDB3/js/dashboard/widgets/widgetSettings/actions/handleParameterSetRestoreBatch.js
KDB3/js/dashboard/widgets/widgetSettings/actions/parameterSetRestoreBatchCommits.js
```

---

## Section C. Per-file

#### `buildWidgetObject.js`

- **Role:** GET emit `grp`
- **Lines:** now 114; hard **150**. Compact maps.
- **AMD:** stay **2**. No barrel. No `_KDB`.
- **Factory-scope** (never nested): `TYPE_ALIAS`, `TYPE_BUCKET`, `GRAINS`, `resolveGetBucket(_type)`, `isAllowedGrain(_bucket, _grain)`.
- **Alias:** `line→Line`, `pie→Pie`, `stackedbar→StackedBar`, `stackedcolumn→StackedColumn`, `list→List`, `prognose` + both IBM ids → `Prognose`. `toLowerCase()`.
- **Bucket:** `Line→Line`, `StackedBar→StackedBar`, `StackedColumn→StackedColumn`, `Pie`/`pie→pie`, `List→List`, `Prognose` + both IBM ids → `com.ibm.vis.custom.prognoseyearlinechart`.
- **Allow:** List = `jahr`\|`jahrStichtag`; Prognose bucket = never; pie/Stacked* = five minus `stichtag`; else (Line) all five.
- **Emit** after `vals` (not `assignOptionalString`): if `GRAINS[settings.grouping]` && `isAllowedGrain(resolveGetBucket(common.type), settings.grouping)` → `common.grp = settings.grouping`.
- **Must not:** Q6-B omit-equals-default; stamp keys; import identity.
- **Rules:** `amd.mdc`, `naming.mdc` (`_` on boundary), `error-handling.mdc` (existing try/catch stays).

#### `v3Defaults.js`

- **Role:** catalog `WIDGET_FIELDS.vis.grp`
- **Lines:** 135 → 136. Hard 150.
- **Add only:** `grp: Object.freeze({ type: "string", required: false })` next to `vals`.
- **Must not:** allowlist table; `SCHEMA_VERSION` bump.
- **Rules:** `feature-structure.mdc` config.

#### `validateWidgetFields.js`

- **Role:** five-token special-case
- **Lines:** 60 → ~66. AMD stay 1.
- **In `case "string"`:** if `fieldName === "grp"` and value is not one of the five tokens → `pushInvalid` `"widget grp must be a grouping grain"`.
- **Must not:** per-vis allowlist; treat `"inherit"` as omit-sentinel.
- **Rules:** `error-handling.mdc`, `naming.mdc`.

#### `handleParameterSetRestoreBatch.js`

- **Role:** `VIS_KEYS`
- **Change:** add `grp: 1` on the existing `VIS_KEYS` object (same line if possible).
- **Must not:** commit logic.
- **Rules:** `amd.mdc` (no new import).

#### `parameterSetRestoreBatchCommits.js`

- **Role:** SET Family A + CLEAR
- **Lines:** 113; target ~125–137; hard **150**. AMD 4 → **5**.
- **New import (last):** `"../../widgetVis/config/visTypes/resolveVisTypeIdentity.js"` as `_resolveVisTypeIdentity`.
- **After `vals` `hasOwnProperty`, before `stampPanelIfMounted`:** if `hasOwnProperty(_entry, "grp")` and `isAllowedGrain(_resolveVisTypeIdentity.resolveVisPropBucketKey(_entry.type, _KDB), _entry.grp)` → `commitDirect(..., "grouping", _entry.grp)`. Else leave absent.
- **Factory-scope** `isAllowedGrain` — same predicate as GET. Do **not** call `resolveEffectiveGrain`.
- **Must not:** `commitRequiredSetting`; `commitDirect` `defaultGrain`; edit stamp / `commitWidgetSettingValue`.
- **Rules:** `amd.mdc` ≤10; `state.mdc` owner write via existing commit; `error-handling.mdc` existing try on stamp stays.

---

## Section D. Acceptance

- GET: inherit omit; Line explicit `stichtag` emits; List `stichtag` omit; Prognose never emits; pie `jahr` emits.
- Validate: five tokens pass; `"inherit"` / junk fail field; `stichtag` on List is valid **field** (CLEAR is SET).
- SET: legal token `commitDirect`; illegal / Prognose leave absent; missing leave absent.
- Snapshot / chrome / stamp / `vals` path untouched.
- No file >150. No AMD >10. No new service.

## Section E. Forbidden

C/E/pie+DST/toast. Family A helper. `assignOptionalString` for `grp`. SCHEMA bump. `groupingMeta` v3. Edit nobody-list.
