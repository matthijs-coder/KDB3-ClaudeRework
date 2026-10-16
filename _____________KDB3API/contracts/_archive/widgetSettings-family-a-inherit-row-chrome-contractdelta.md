# Contract Delta: Family A inherit-row chrome (G + H)

> Zeitebene + Werte anzeigen: Dimension-default look on the inherit row; showValues gets **Diagrammstandard**; click = field **absent**.
> PO vastenburg 2026-09-12: product lock on captain rec. Not C. Not Q6. Not a grouping-F reopen.
> G = grouping look only. H = narrow D2 chrome/click/history. A/B/F stay `Implemented`. D2 KEEP / `vals` / List hide / catalog maps / seed stay.

---

**Status:** `Implemented` — PO canvas green 2026-09-12. Icon-size polish (grouping/showValues 22px) same day.
**Owner module / service:** `widgetSettings` (chrome + commit-delete); `widgetVis` (property-only inherit write)
**Type:** `feature-module contract delta`
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-12
**Reviewed by:** army rec-check HOLD-WITH-GATES (gates folded); zoom semantic GO; zoom mechanical GO; PO vastenburg product lock
**Related rules:** `feature-structure.mdc` (workflow), `state.mdc`, `amd.mdc`, `naming.mdc`, `dom.mdc`
**Family:** A inherit. Chrome key `inherit` never stored. Forbidden: `"none"` / `"default"` / `""` / `diagramm`.

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/widgetSettings-setting-family-contractdelta.md` | §3.1 Chrome: unset **marks inherit row**. Lift “no reopen D2” only for this cite. No helper / registry. |
| `contracts/widgetVis-show-values-contractdelta.md` | Narrow H: options, unset display, inherit click, history row, §6.2 envelope `inherit`, acceptance 1 / 2 / 3. **Do not** reopen KEEP, GET omit-when-inherit, `vals` 0\|1 when explicit, List CSS-hide, catalog maps, seed, contrast §6.1a, adapter, **or** `overlayShowValuesOnLayoutMap`. |
| `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` | **Step G:** inherit row may set `isDefault: true` for `data-kdb-default` look. Supersedes B §11.3 “no `isDefault`” **for the inherit row only**. Grain rows stay without `isDefault`. F token/delete/CLEAR unchanged. |
| `contracts/widgetSettings.md` §4.2 | Live A unset chrome = inherit row, not catalog look. |
| `contracts/historyService.md` | **No new key.** Replay stays `widgetSettings_optionSelect`. |
| `contracts/writeback.md` | **No change.** GET still omits `vals` when inherit. |

---

## 1. Purpose

Dimension **Ohne** looks like the default because `isDefault: true` → `data-kdb-default="1"` → existing dashed rule. Grouping already has Diagrammstandard but no flag. showValues has no inherit row and marks catalog Anzeigen/Ausblenden while unset.

This WP gives both Family A dropdowns the same inherit chrome, and makes showValues inherit-click the same machine as grouping: **delete the key**.

---

## 2. Product (locked)

| Topic | Law |
|---|---|
| Label | **Diagrammstandard** (same DE as Zeitebene). Chrome key / value `inherit`. Never stored. |
| Look | Reuse `.KDB_IconsDropdown .dataWidgetIcon[data-kdb-default="1"]` (2px dashed). No new CSS. No extra min-height. |
| Unset chrome | Mark **Diagrammstandard**. Do **not** mark catalog Anzeigen/Ausblenden or `defaultGrain`. |
| Inherit click | Delete `settings.grouping` or `settings.showValues` (+ matching `*Meta`). Do not write `null` / `defaultGrain` / catalog boolean. |
| Concrete click | Still commits explicit (grain token / `true`\|`false`). No “already showing catalog → stay inherit” on Anzeigen/Ausblenden. |
| visType | showValues KEEP explicit boolean (D2). Unset follows new catalog. Do **not** copy grouping KEEP-specialize / CLEAR onto showValues. |
| List | showValues icon stays CSS-hidden; control **stays** in DOM. Inherit apply = Cognos no-op + still delete the key. |
| Seed | Still omit. No `dropdownDefaults` / `VIS_STARTUP_KINDS` row for grouping or showValues. |

**Line inherit-off vs explicit-off (canvas):** same pixels on Line (both hidden). Differ on GET (`omit` vs `vals: 0`) and on switch to Column (inherit **shows**; explicit-off **stays hidden**). That distinction is intended.

---

## 3. Step G — Zeitebene look

One flag in `options.js` on the existing grouping inherit row: `isDefault: true`.

`populateStaticDropdown` already honors `isDefault` and does **not** run `applyConfiguredDefault` for grouping. No duplicate row. No CSS edit. No apply/commit/stamp change.

---

## 4. Step H — showValues Diagrammstandard

### 4.1 Chrome

`options.js` `showValues` first row:

`{ key: "inherit", label: "Diagrammstandard", value: "inherit", isDefault: true }`

then Anzeigen / Ausblenden.

`stampPanelVisType` **always** remakes the showValues mark (same shape as grouping). Boolean → `"on"` / `"off"`; else `"inherit"`. Drop unused `inheritKey`. Do **not** merge grouping into that key / `markShowValuesOption`. Keep the two mark functions.

Today stamp **skips** when `showValues` is already a boolean. After inherit is first + `isDefault`, that skip leaves Diagrammstandard selected on SET `vals: 0|1` / rebuild. That is a **must**. Dropping `inheritKey` pays the line.

`showValuesDropdownSafeguard.resolveShowValuesOptionKey`: unset → `"inherit"`. Delete the list/line/prognose catalog ternary.

**First-click-hole package** (all required): inherit row + stamp always-remake + safeguard unset→`"inherit"` + history `inherit` + commit delete only on `"inherit"`. Stamp-only is not enough — failed-apply revert would paint catalog on/off again.

### 4.2 Two values on inherit click (do not mix)

1. **Settings token** `"inherit"` → commit **deletes** `showValues`. GET omits `vals`.
2. **Cognos write** = catalog boolean for **this** visType from `resolveVisualizationLayoutPropertyValues` (`valueLabels.visible`). Line/Prognose `false`; Stacked*/Pie `true`; List no write.

If (2) is stored in settings, inherit becomes explicit. That is the product failure.

`resolveCanonicalVisOptionValue`: **passthrough** `"inherit"`. Do not map inherit → boolean.

`reportToSettings.nextValue` stays `"inherit"`. Do not mutate `payload.nextValue` to the catalog boolean. `commitWidgetSettingValue` prefers `report.nextValue` — a leaked boolean **stores** KEEP.

### 4.3 Apply (property-only)

Stay on `widgetVis/applyShowValues`. Do **not** route through `handleApplySetting` / full rebind.

`handleApplyShowValues`: accept `"inherit"` (today boolean-only → fail-close). List no-op **before** catalog write. Report `"inherit"`.

`applyShowValues` **write fn only**: if inherit, read catalog via `resolveVisualizationDefinitions.js` (`resolveVisualizationLayoutPropertyValues`) and write that boolean + contrast-if-shown (§6.1a: contrast only when the written boolean is `true`). AMD 2→3. Do **not** import the binding-config barrel (already AMD 9).

**Overlay isolation:** do **not** edit `overlayShowValuesOnLayoutMap` (same file). It stays `typeof settings.showValues === "boolean"` / else leave catalog. Do **not** edit `applyVisualizationProperties.js` (150). Catalog resolve lives only in the write fn — not in handle, overlay, canonical, or snapshot.

`handleApplySetting.js`: **no edit** (149). Grouping inherit delete there is the binding snapshot, not showValues commit.

### 4.4 Commit

Extend the **in-file** delete helper in `commitWidgetSettingValue.js`:

- grouping: keep `value === "inherit" \|\| !grainToken` → delete `grouping` + `groupingMeta`
- showValues: **`value === "inherit"` only** → delete `showValues` + `showValuesMeta`

Do **not** reuse `!isGroupingGrainToken` for showValues (`true`/`false` would delete). No new module. No `_KDB.services.settingFamily`. Family helper waits for a **third** A control.

### 4.5 Snapshot (150 — no edit)

`buildWidgetVisSettingsSnapshot.js` stays 150. Inherit click may leave `snapshot.showValues === "inherit"` (string). Overlay / copy helpers already ignore non-booleans.

Do **not** map inherit → `undefined` on that assignment: `_nextValue != null ? _nextValue : snapshot[control]` would **keep the previous explicit boolean**.

### 4.6 History

Same key `widgetSettings_optionSelect`. Add row: Diagrammstandard → `optionKey`/`optionValue` `inherit`. Replay uses the same apply path (must accept inherit). Undo inherit → previous explicit boolean. Undo first Anzeigen from unset → inherit (not explicit `false`). That is the D2 first-click hole this chrome fixes.

Inherit click while already unset: same as grouping (may push a no-op step). Do not add an already-selected guard. Do not edit `bindWidgetSettingsPanel.js`.

---

## 5. Files after Approved + spec

| File | Change |
|---|---|
| `options.js` | G flag + H inherit row |
| `stampPanelVisType.js` | always remake: boolean → on/off, else inherit; drop `inheritKey` |
| `showValuesDropdownSafeguard.js` | unset → inherit |
| `commitWidgetSettingValue.js` | kind-aware delete |
| `handleApplyShowValues.js` | accept inherit; report inherit |
| `applyShowValues.js` | write fn: catalog read + boolean write. **Do not** change `overlayShowValuesOnLayoutMap`. |

**Do not touch:** `handleApplySetting.js`, `bindWidgetSettingsPanel.js`, `dropdownDefaults.js`, `VIS_STARTUP_KINDS`, `populateStaticDropdown.js`, `resolveCanonicalVisOptionValue.js`, `buildWidgetVisSettingsSnapshot.js`, CSS, `applyVisualizationProperties.js`, `KDB.js`, `sorting.js`.

---

## 6. Anti-goals

- New CSS / first-child dashed / extra height
- `applyConfiguredDefault` or `dropdownDefaults` for Family A
- Merge grouping into showValues `inheritKey`
- Full rebind for showValues
- Shared inherit helper / family registry / new service
- Map inherit → boolean in canonical / report / commit
- Write `null` / `"none"` / `"default"` / `""` / `defaultGrain`
- Copy grouping CLEAR onto showValues
- Omit-when-equals-catalog (Q6)
- C / D / E / toast / `grp` / `SCHEMA_VERSION`
- Third `*DropdownSafeguard.js`
- Hide inherit row by allowlist
- Edit `overlayShowValuesOnLayoutMap` / resolve catalog inside overlay or handle

---

## 7. Canvas (PO certifies Cognos; captain does not)

1. Zeitebene: Diagrammstandard taller/dashed like Dimension Ohne; click still deletes grouping.
2. showValues: three rows; unset marks Diagrammstandard. **WP1 chrome:** visible words are now Aus / Standard / Ein (off-left pill; Standard = middle). Mark/GET/`vals` unchanged — `widgetSettings-vis-toggle-panel-wp1-contractdelta.md`.
3. Line inherit vs Line Ausblenden: both hidden; switch to Column → inherit shows, explicit-off stays hidden.
4. Column inherit → Diagrammstandard; GET omits `vals`. Column Ausblenden → `vals: 0`.
5. Anzeigen then Diagrammstandard: labels return to catalog; key gone. Column Ausblenden → Diagrammstandard: values **shown** + contrast flags (§6.1a).
6. Undo first Anzeigen on a new Line: back to Diagrammstandard (not explicit Ausblenden).
7. List: icon still hidden.
8. Restore `vals: 0` / `1`: chrome marks Ausblenden / Anzeigen, **not** Diagrammstandard. **WP1:** those marks are Aus / Ein (off-left). Undo/redo still moves the mark (now the knob).

---

## Approval Log

| Date | Status | Who | Notes |
|---|---|---|---|
| 2026-09-12 | Product lock | PO vastenburg | Rec G+H + inherit-delete. Army rec-check in flight. |
| 2026-09-12 | `Draft` | captain | This file. No JS. |
| 2026-09-12 | Draft gate: stamp both states | army rec-check HOLD-WITH-GATES | Boolean → on/off; else inherit. Unset-only mark lies after `vals` restore. |
| 2026-09-12 | Draft gate: overlay isolation | army semantic HOLD-WITH-GATES | Catalog resolve in write fn only. Overlay helper untouched. Import definitions, not barrel. |
| 2026-09-12 | Zoom semantic GO | army | No must-change. List wording: control stays in DOM. Mechanical zoom still open. |
| 2026-09-12 | Zoom mechanical GO | army | Six confirms hold. No Fatal. |
| 2026-09-12 | `Draft` → `Approved` | PO vastenburg (product lock) + dual GO/GO | Spec next; then JS. |
| 2026-09-12 | Spec Ready | captain | `widgetSettings-family-a-inherit-row-chrome-execution-spec.md`. Six exclusive writers. |
| 2026-09-12 | `Approved` → `Implementing` | captain; army; dual GREEN/GREEN | Spec Executed. Await PO Cognos. |
| 2026-09-12 | `Implementing` → `Implemented` | PO vastenburg | Cognos canvas green. |
| 2026-09-12 | Icon size polish | PO vastenburg | grouping/showValues bar icons 18→22px (SVG padding). |
| 2026-09-12 | WP1 chrome pointer | captain; PO GO | Canvas 2/8: showValues words Aus/Standard/Ein. Machine unchanged. |
