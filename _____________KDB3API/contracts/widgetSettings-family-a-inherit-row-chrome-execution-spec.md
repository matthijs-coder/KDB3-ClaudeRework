# Execution Spec: Family A inherit-row chrome (G + H)

> Mechanical spec for grok 4.6 army. Architecture: `contracts/widgetSettings-family-a-inherit-row-chrome-contractdelta.md` (**Approved**).
> Echo Section A **before** producing files. Do not stamp chrome-delta `Implemented`. Do not start C/D/E.

---

**Status:** `Executed` — six writers landed; dual JS GREEN/GREEN 2026-09-12. Await PO canvas. Chrome-delta not `Implemented`.
**Module / contract:** family-a-inherit-row-chrome
**Phase:** `extension` (G + H)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-12
**Executing AI:** grok 4.6 army
**Reviewer:** captain + dual grok 4.6 review

---

## Waves

Six exclusive writers, **all parallel**. No shared files.

## Exclusive allowlists

### W-OPT

**May edit:** `KDB3/js/dashboard/widgets/widgetSettings/config/options.js`

**Must not:** stamp, apply, commit, CSS, `dropdownDefaults.js`.

### W-STAMP

**May edit:** `KDB3/js/dashboard/widgets/widgetSettings/view/stampPanelVisType.js`

**Must not:** options, apply, safeguard, commit.

### W-SAFE

**May edit:** `KDB3/js/dashboard/widgets/widgetSettings/view/showValuesDropdownSafeguard.js`

**Must not:** stamp, options, apply.

### W-COMMIT

**May edit:** `KDB3/js/dashboard/widgets/widgetSettings/state/commitWidgetSettingValue.js`

**Must not:** apply, stamp, snapshot.

### W-HANDLE

**May edit:** `KDB3/js/dashboard/widgets/widgetVis/actions/handleApplyShowValues.js`

**Must not:** `applyShowValues.js` overlay; `handleApplySetting.js`.

### W-APPLY

**May edit:** `KDB3/js/dashboard/widgets/widgetVis/effects/applyShowValues.js` — **write fn `applyShowValues` only**.

**Must not:** change `overlayShowValuesOnLayoutMap`. Edit `applyVisualizationProperties.js`. Import the binding-config barrel.

### Nobody

`handleApplySetting.js`, `bindWidgetSettingsPanel.js`, `buildWidgetVisSettingsSnapshot.js`, `dropdownDefaults.js`, `populateStaticDropdown.js`, `resolveCanonicalVisOptionValue.js`, `applyVisualizationProperties.js`, CSS, `KDB.js`, `sorting.js`, `.mdc`, contracts (captain).

---

## Section A. Pre-flight

Read in order; echo **one sentence** each. Do not paste rule bodies.

1–11. The 10 MUST `.mdc` + `cognos-adapter.mdc`
12. `contracts/widgetSettings-family-a-inherit-row-chrome-contractdelta.md` (Approved)
13. This spec

Also echo: G = grouping inherit `isDefault: true` only. H = showValues inherit row; stamp always remake (boolean→on/off else inherit); safeguard unset→inherit; commit delete showValues **only** on `"inherit"`; handle accepts inherit and **reports inherit**; apply write fn reads catalog via `resolveVisualizationDefinitions.js` and writes boolean + contrast-if-shown; overlay helper untouched; no inherit→boolean leak; snapshot / handleApplySetting / bind panel / CSS untouched.

---

## Section C. Per-file

#### `options.js`

- Grouping inherit row: add `isDefault: true`.
- showValues: prepend `{ key: "inherit", label: "Diagrammstandard", value: "inherit", isDefault: true }`. Keep Anzeigen / Ausblenden.
- AMD `[]`. Stay small.
- **Rules:** `naming.mdc`; chrome delta §3 / §4.1.

#### `stampPanelVisType.js`

- **Always** remake showValues: `typeof record.showValues === "boolean"` → mark `"on"` / `"off"`; else mark `"inherit"`.
- Drop unused `inheritKey` (and the catalog ternary).
- Do **not** merge grouping into showValues mark. Keep both mark functions.
- Grouping mark unchanged.
- ≤150. AMD 4 unchanged (do not add imports).
- **Rules:** `amd.mdc`; `dom.mdc`; chrome delta §4.1.

#### `showValuesDropdownSafeguard.js`

- `resolveShowValuesOptionKey`: boolean → `"on"` / `"off"`; else `"inherit"`. Delete list/line/prognose ternary.
- If `dropdownDefaults` is then unused, **drop that import** (AMD hygiene).
- **Rules:** `amd.mdc`; chrome delta first-click-hole package.

#### `commitWidgetSettingValue.js`

- Kind-aware delete: grouping keep today’s rule; showValues delete **only** if `value === "inherit"` (`showValues` + `showValuesMeta`).
- Do **not** reuse `!isGroupingGrainToken` for showValues.
- Kind-split: one inherit click must not delete the sibling A field.
- **Rules:** `state.mdc`; chrome delta §4.4.

#### `handleApplyShowValues.js`

- Accept `"inherit"` (today boolean-only fail-closes).
- List no-op path may stay in the write fn — do **not** duplicate catalog resolve here.
- Pass `"inherit"` through to `applyShowValues`.
- `reportToSettings.nextValue` / `payload.nextValue` stay `"inherit"`. Do **not** mutate to the catalog boolean.
- Other non-boolean / non-inherit still fail-close.
- **Rules:** `error-handling.mdc`; chrome delta §4.2 / §4.3.

#### `applyShowValues.js` (write fn only)

- If `_nextValue === "inherit"`: List no-op first (already); else read `resolveVisualizationLayoutPropertyValues` from `../config/visTypes/resolveVisualizationDefinitions.js` (not the barrel). Write `valueLabels.visible` / `labels.visible` from catalog `valueLabels.visible` (boolean). Contrast only if that written boolean is `true` (existing `_nextValue === true` path — use the **written** boolean).
- Overlay helper: **byte-identical behavior**. Do not change `overlayShowValuesOnLayoutMap`.
- AMD 2→3. Stay ≤150.
- Do not return the catalog boolean as something handle will report.
- **Rules:** `amd.mdc`; `cognos-adapter.mdc`; chrome delta §4.3 overlay isolation.

---

## Section J. Acceptance

1. Grouping inherit row has `isDefault: true`. showValues first row is inherit / Diagrammstandard / `isDefault`.
2. Stamp: unset → inherit selected; explicit true/false → on/off selected.
3. Safeguard unset → inherit. No catalog ternary.
4. Commit `"inherit"` on showValues deletes the key. `true`/`false` still store.
5. handle + apply: inherit writes catalog boolean to Cognos; report stays `"inherit"`. Overlay helper unchanged.
6. Report: echoes + line counts + AMD.

## Section K. Forbidden

- Map inherit → boolean in canonical / report / commit / payload.
- Edit snapshot, `handleApplySetting`, bind panel, CSS, barrel import, overlay helper.
- Seed / `dropdownDefaults` row / `VIS_STARTUP_KINDS`.
- New service / family helper / third safeguard.
- C/D/E / Q6 / toast.
- Skip Section A echo.

## Section L. Writer report

Echoes + file table (path, lines, AMD, matches|deviation).

## Section M. Review

Dual FAIL/NIT. Listed paths only. Do not paste `.mdc`.

---

## Approval Log

| Date | Status | Who | Notes |
|---|---|---|---|
| 2026-09-12 | `Ready for execution` | captain (PO lock + dual GO/GO) | Six parallel exclusive writers. |
| 2026-09-12 | `Executed` | captain; army W-OPT/STAMP/SAFE/COMMIT/HANDLE/APPLY; dual GREEN/GREEN | Await PO canvas. |
| 2026-09-12 | PO canvas green | PO vastenburg | Chrome-delta `Implemented`. |
