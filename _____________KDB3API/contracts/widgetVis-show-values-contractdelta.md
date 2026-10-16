# Contract Delta: vis widget “Werte anzeigen” (`showValues`)

> Delta on `contracts/widgetSettings.md` (control, state, history, restore) and `contracts/widgetVis.md` (Cognos overlay). Also amends `writeback.md` vis `wgts[]`, `widgetSettings-parameterSetRestore-contractdelta.md`, `widgetVis-drillthrough-focus-restore-contractdelta.md` (focus icon allow-list).
>
> PO vastenburg 2026-09-02: D2 + List CSS-hide keep-DOM + Line/Prognose may show when user picks Anzeigen. Icon **`99`** as `KDB3/images/showValues.svg`. Copy **Werte anzeigen** / Anzeigen / Ausblenden.

---

**Status:** `Frozen` — PO vastenburg 2026-09-02. **H `Implemented`:** inherit-row chrome `contracts/widgetSettings-family-a-inherit-row-chrome-contractdelta.md`. KEEP / `vals` / List hide / catalog maps / seed stay Frozen. Toolbar icon and title amended 2026-09-28: `adjust.svg`, tooltip Zusatzoptionen.
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-02
**Reviewed by:** PO vastenburg, approved 2026-09-02
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`, `cognos-adapter.mdc`

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/widgetSettings.md` | live control, state key, snapshot (optional 4th field), history `widgetSettings_optionSelect`, panel `data-kdb-vis-type` |
| `contracts/widgetVis.md` | §7.0 overlay; new `applyShowValues` (property-only); no `widgetVis` history key |
| `contracts/writeback.md` §4.5 / §4.5.1 | vis optional `vals` |
| `contracts/widgetSettings-parameterSetRestore-contractdelta.md` | consume `vals`; restore allowlist |
| `contracts/widgetVis-drillthrough-focus-restore-contractdelta.md` | visible focus icons + showValues except List |
| `contracts/cognosHostService.md` | **no new facet / no new op** — reuse `visualization.setContentProperty` |
| `contracts/historyService.md` | **no new key** — replay stays `widgetSettings_optionSelect` |

---

## 1. Purpose

Users can show or hide datapoint values on vis widgets (Cognos `valueLabels.visible` + `labels.visible`) from the settings icon row, same chrome family as Diagrammtyp / Dimensionen / TopN.

Today those flags are **baked per vis type** in `_KDB.config.visualizations.definitions` (`layoutPropertyValues`): Line and Prognose `false`; StackedBar / StackedColumn / Pie `true`; List does not set them. This delta keeps that catalog as the **inherit default** (D2) and adds an explicit user override.

The settings panel may host sibling Family A rows (Iterator / Zoomleiste) — `contracts/widgetSettings-vis-toggle-panel-wp2-contractdelta.md`. KEEP / `vals` / List / catalog / seed / contrast / `overlayShowValuesOnLayoutMap` stay Frozen.

---

## 2. Product (locked)

| Topic | Decision |
|---|---|
| Control | Live settings icon + `KDB_IconsDropdown` with three options |
| Title | `Werte anzeigen` |
| Options | **Aus** (`off`) / **Standard** (`inherit`, never stored) / **Ein** (`on`) — visual + DOM order. Machine still H delete-key. WP1: `contracts/widgetSettings-vis-toggle-panel-wp1-contractdelta.md`. Visible words replace Anzeigen / Diagrammstandard / Ausblenden. |
| Default | **D2 inherit:** until the user (or undo/redo of this control, or SET `vals`) commits an explicit boolean, effective = type catalog |
| Line / Prognose | Catalog inherit = hidden. User **Anzeigen** is allowed and must show values |
| List | Icon **not visible**. Control stays in DOM. State kept. Cognos value-label keys **not written** |
| Icon asset | Toolbar button superseded 2026-09-28: **`KDB3/images/adjust.svg`** (two sliders). Glyph `99` / `showValues.svg` is not the button. `contracts/widgetSettings-iterator-standard-on-contractdelta.md` lock 1. |
| Persist | Both layers. v3 key `wgts[].vals` `0\|1`. Omit when inherit (user never overrode) |
| History | Settings-owned `widgetSettings_optionSelect`. Undo/redo must move Cognos labels |
| Adapter | Stamped `visualizationFacet.setContentProperty` only. No `_KDB.cognosAPI` in `widgetSettings` / deep `widgetVis`. No new cognosHost facet |

Catalog inherit (normalized vis type via existing `normalizeVisualizationType`):

| Settings / normalized type | Inherit `valueLabels.visible` / `labels.visible` |
|---|---|
| `line` / `Line` | `false` |
| `com.ibm.vis.custom.prognoseyear` / `Prognose` | `false` |
| `stackedbar` / `StackedBar` | `true` |
| `stackedcolumn` / `StackedColumn` | `true` |
| `pie` / `Pie` | `true` |
| `list` / `List` | N/A — do not write those keys |

---

## 3. Ownership

| Concern | Canonical owner | Others |
|---|---|---|
| Control value `showValues` (`undefined` inherit \| `true` \| `false`) | **widgetSettings** `_KDB.state.widgets.settings.byWidget[id]` | widgetVis reads via snapshot / apply payload only |
| History step | **widgetSettings** `widgetSettings_optionSelect` | widgetVis never pushes history |
| Cognos `valueLabels.visible` / `labels.visible` | **widgetVis** via stamped `visualizationFacet.setContentProperty` | ring 1 `setContentProperty.js` calls host `setContentPropertyValue` |
| Catalog maps in `definitions.js` | stay the inherit source | widgetVis overlays; does **not** mutate the config object |
| Writeback `vals` | widgetSettings collect + restore | GET omit when inherit |
| CSS hide on List | widgetSettings stamps `data-kdb-vis-type` on the settings panel; CSS hides the icon | widgetVis focus clone copies the attr |

**Forbidden:** `_KDB.api.canvas` for this flag. `classList` on `#main`. New events. New `_KDB` top-level. `_KDB.cognosAPI` / `__getDashboardAPI` from widgetSettings or deep widgetVis. New cognosHost facet. Baking the user toggle into `definitions.js` as the only mechanism. Gating the settings gear. Touching sister `hidWs` / maximize / Diagramme settings-buttons.

---

## 4. D2 semantics (inherit vs explicit)

State field `showValues`:

- **Absent / `undefined`:** inherit catalog for the **current** `visType`. Dropdown **marks Diagrammstandard** (not catalog Anzeigen/Ausblenden). Do not commit inherit on `seedDefaults`.
- **`true` / `false`:** explicit override. Survives vis-type switches (including List and back) — **KEEP-all-vis**. Grouping is KEEP-specialize, not this machine (`contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` §15). Cognos overlay uses this boolean on every non-List apply.

Vis-type change does **not** rewrite `showValues`. Line (inherit hidden) → Column still inherit → Column catalog **shows** values. Undo visType restores Line → inherit hidden again. One history step (`kind: "visualization"`) is enough.

User click **Anzeigen / Ausblenden** commits explicit `"on"` / `"off"` → boolean. User click **Diagrammstandard** deletes the key (Family A absence) and writes the current catalog boolean to Cognos; `reportToSettings.nextValue` stays `"inherit"`. Both create a `showValues` history step.

List: keep inherit or explicit as stored; never apply label properties.

---

## 5. widgetSettings chrome + state

### 5.1 Control

Insert in `controlDefinitions.js` `live[]` **immediately before** `reset` (after `backgroundColor` in the bar suffix):

```js
{
  kind: "showValues",
  ariaLabel: "showValues",
  className: "KDB_showValuesButton",
  icon: "adjust.svg",
  title: "Zusatzoptionen",
  dropdownClass: "KDB_showValuesContainer"
}
```

Not in `text[]`. Keep in `live[]` for List (CSS-hide, do not omit).

`options.js`:

```js
showValues: [
  { key: "off", label: "Aus", value: "off" },
  { key: "inherit", label: "Standard", value: "inherit", isDefault: true },
  { key: "on", label: "Ein", value: "on" }
]
```

Hardcoded German, same as Diagrammtyp. No `_KDB.config.labels.de` bucket.

### 5.2 List hide (variant A)

Stamp `data-kdb-vis-type` on `.KDB_widgetSettings` from committed (else dropdown-default) `visType`, normalized to the settings key (`line` / `list` / `pie` / `stackedbar` / `stackedcolumn` / prognose id). Update on visType commit, seed, restore, and `syncPanelFromState`. Copy the same attribute onto `.KDB_focusModeSettingsPanel` when the clone is built. From 2026-09-28, `stampPanelVisType` also runs after every confirmed vis dropdown commit and marks the canvas visualization, dimension, and topN rows (`contracts/widgetSettings-focus-canvas-option-stamp-contractdelta.md`). The focus clone still receives only `data-kdb-vis-type` from that stamp.

CSS in `KDB3/css/widgets/widgetSettings.css` (specificity must beat `.dataWidgetIcon { display: inline-flex }`, same lesson as maximize hide — target 0,6,0, no `!important` on the live bar):

```css
.liveWidget .KDB_widgetSettings[data-kdb-vis-type="list"] .KDB_widgetSettingsHeaderRow .KDB_widgetSettingsIcons > .dataWidgetIcon.KDB_showValuesButton {
  display: none;
}
```

Focus panel: same hide when `data-kdb-vis-type="list"`. Do **not** `display:none` via `filterFocusPanelIcons` (that **deletes** nodes). Add `KDB_showValuesButton` to the focus **keep** list so non-List focus still shows the icon.

### 5.3 Intent + commit-after-apply

`intentDispatchMap`: `showValues` → target `widgetVis`, type `widgetVis/applyShowValues`.

Same vis dropdown safeguard as dimension / visType / topN: optimistic DOM, commit `showValues` only after `reportToSettings` success, revert via `syncPanelFromState` on failure, `stale: true` must not revert, pending class on the icon.

`kindToStateKey.showValues` → `showValues`. Map option `on`/`off` → boolean `true`/`false` at commit. Option `inherit` **deletes** the key (do not store `"inherit"` / `null`). Replay uses the same option keys.

`settingsSnapshot` for **all** vis applies (including existing dimension / visType / topN / startup batch) **may** include `showValues` when explicit. Completeness check stays `{ dimension, visType, topNChoice }` — `showValues` is **optional**. If omitted, widgetVis inherits catalog.

Startup `seedDefaults` / `applyStartupSettings`: do **not** put `showValues` in `changedControls` and do **not** commit it. Overlay uses inherit.

---

## 6. History (undo / redo)

Reuse key **`widgetSettings_optionSelect`**. No new history key. No `widgetVis` history.

Descriptor frame (existing shape): `{ widgetId, widgetType, kind: "showValues", optionKey, optionValue, target, type }`.

| User action | `kind` | `optionValue` | Replay |
|---|---|---|---|
| Diagrammstandard | `showValues` | `inherit` | mark inherit → `applyShowValues` `{ nextValue: "inherit", isHistoryReplay: true }` (Cognos write = catalog boolean; commit deletes) |
| Anzeigen | `showValues` | `on` | mark option → `applyShowValues` `{ nextValue: true, isHistoryReplay: true }` |
| Ausblenden | `showValues` | `off` | same with `false` |

Push **after** confirmed apply (`pushHistoryAfterConfirmedApply`). `isHistoryReplay` must not push again.

Undo/redo of **visualization** type does not emit a second showValues step; inherit follows the restored `visType`. If `showValues` was already explicit, it stays in settings state across that visType undo (same as dimension/topN today).

Settings-delete undo (`restoreCommittedSettings` → `applyStartupSettings` with committed snapshot): include explicit `showValues` when present so labels match pre-delete.

Colour path stays unrelated. Maximize stays without history.

---

## 7. widgetVis consequence

### 6.1 Overlay (normative)

`applyVisualizationProperties` (pre-binding and post-render `force`) must overlay catalog `layoutPropertyValues` **after** reading the maps, **before** `setContentProperty`:

```txt
effectiveShowValues =
  (typeof snapshot.showValues === "boolean")
    ? snapshot.showValues
    : catalogInherit(normalizedVisType)

if normalized type is List:
  do not write valueLabels.visible or labels.visible
else:
  write both keys to effectiveShowValues
```

Do not mutate `_KDB.config.visualizations.definitions`. Overlay is per apply.

### 6.1a Contrast flags when values are shown (PO 2026-09-02)

Not a hex / `ctcol` / `_KDB.properties` token. LastOriginal wrote two **Cognos boolean** layout keys on the widget instance when labels were visible:

- `contrast.label.color` = `true`
- `valueLabels.color` = `true`

**When effective values are shown** (explicit `showValues === true`, or inherit and catalog `valueLabels.visible` is already `true`): overlay **adds** both keys to the cloned layout map, then `applyPropertyMap` writes them. Property-only `applyShowValues` with `nextValue === true` writes the same two keys after the visibility pair.

**When values are hidden** (explicit false, or Line/Prognose inherit): do **not** write those keys (do not force `false`). List: still no label/contrast keys.

Do not bake into `definitions.js`. Do not port `.markerLabel` CSS. Do not `whenRenderComplete` wait on the toggle path (post-render `force` is the after-paint analog).

Skip gate today: `dimension` / `topN` / unchanged vis type → skip property apply. **A showValues-only change must not skip.** `reason: "showValues"` (or `force: true` on this path) is in `APPLY_ON_REASON` / skip bypass. Post-render already `force: true` and must overlay too, otherwise post-render would **stomp** an explicit override with the catalog.

### 6.2 `widgetVis/applyShowValues`

New action. **Property-only.** No `widgetBindingPlan.buildPlan`, no `applyBinding`, no slot/title/legend pipeline, no `opSeq` bind bump.

```js
{
  control: "showValues",
  previousValue: boolean | null,  // null = was inherit
  nextValue: boolean | "inherit",
  settingsSnapshot: object,       // visType required so List can no-op
  source: "user" | "historyReplay",
  isHistoryReplay: boolean
}
```

Steps:

1. If disposed / missing facet: existing silent disposed / fail shape; no history (caller does not push).
2. If normalized visType is List: success no-op (`ok: true`, `reportToSettings`, no Cognos writes).
3. Else: resolve the Cognos boolean (`nextValue` if boolean; if `"inherit"`, catalog `valueLabels.visible` from `resolveVisualizationLayoutPropertyValues`). Write `valueLabels.visible` + `labels.visible` to that boolean. If that boolean is `true`, also write `"contrast.label.color"` and `"valueLabels.color"` as `true` (§6.1a). All through the **stamped** facet (`readVisualizationFacet`). Not `_KDB.cognosAPI`. `reportToSettings.nextValue` stays the payload token (`true` / `false` / `"inherit"`).
4. Host Outcome fail → `ok: false`, no settings commit.
5. Success → `reportToSettings` `{ control, previousValue, nextValue }` so widgetSettings commits + history.

`source: "startup"` is not used (inherit overlay on startup property apply is enough).

### 6.3 Adapter

Live caller already: `applyPropertyMap` → `visualizationFacet.setContentProperty`. Ring 1: `cognosHost/facets/visualization/write/setContentProperty.js` → host `setContentPropertyValue`.

This WP **reuses that op**. Parent `widgetVis.md` §7.0 table still names `_KDB.cognosAPI.visualization.setContentPropertyValue` — **patch that cell** to the facet op (documentation drift; this WP must not re-introduce inner-ring calls in feature files).

No new facet. No new visualization op. `cognos-adapter.mdc` D4: existing live caller is enough.

---

## 8. Writeback

New optional vis field `vals` (≤5 chars, unused). Schema type: number `0|1` (widget field types already include `number`; do not invent `flag01` on `wgts`).

| GET | SET / restore |
|---|---|
| Inherit (no explicit `showValues`) | omit `vals` |
| Explicit `true` | `vals: 1` |
| Explicit `false` | `vals: 0` even when that equals catalog (so Column-Ausblenden round-trips) |
| List | still emit `vals` when explicit (round-trip when user returns to a chart type) |

Restore: add `vals` to `WIDGET_FIELDS.vis`, `VIS_KEYS`, `commitVisAndConsequences`. Missing `vals` → leave `showValues` absent (inherit). Present `0`/`1` → commit boolean, `skipHistory: true`, then overlay via existing vis restore apply (startup-shaped snapshot with optional `showValues`). Do **not** call `applyShowValues` as a second restore pipeline if the vis property apply already overlays the snapshot.

Unknown-key reject: `vals` becomes known. v2 map: no `vals` (omit). `newDashboard`: inherit.

---

## 9. Events

None. No `eventSubscribe.md` row.

---

## 10. Implementation files (normative list, not a second architecture)

**widgetSettings:** `controlDefinitions.js`, `options.js`, `intentDispatchMap.js`, `buildWidgetVisSettingsSnapshot.js` (optional field), kind/state maps, `handleApplySetting` / downstream builder, panel stamp `data-kdb-vis-type`, `handleParameterSetRestoreBatch.js` `VIS_KEYS`, `parameterSetRestoreBatchCommits.js`, `bindWidgetSettingsPanel.js` only if the generic dropdown path needs a kind allow-entry.

**widgetVis:** `applyVisualizationProperties.js` (overlay + skip bypass), new `applyShowValues` handler + action route, `isCompleteSettingsSnapshot.js` unchanged (optional field), `filterFocusPanelIcons` keep-list + copy `data-kdb-vis-type` onto the focus panel.

**writeback:** `v3Defaults.js` `WIDGET_FIELDS.vis.vals`, `buildWidgetObject.js` emit, restore already via widgetSettings.

**css:** `widgetSettings.css` List hide; focus-panel hide if the clone does not inherit `.liveWidget` (then a `.KDB_focusModeSettingsPanel[data-kdb-vis-type="list"] …` rule).

**asset:** `KDB3/images/adjust.svg` (2026-09-28). `config/imagePaths.js` only if icons are not all served from the same folder.

**contracts:** this file; parent one-liners in §12.

---

## 11. Out of scope

- Changing catalog defaults in `definitions.js` as a substitute for overlay
- LastOriginal extras (`markerLabel` CSS, Prognose `progFull`). **In scope now (PO 2026-09-02):** Cognos contrast flags when values are shown — see §6.1a.
- Pie `labelLocation` (stays catalog)
- `hideSummaries` on List
- Maximize / dim / topN / colour behaviour
- PDF capture chrome (values are chart content; capture-as-displayed)
- `labels.de` namespace
- BindingPlanSpec stuffing

---

## 12. Parent patches (after PO approval)

| File | Change |
|---|---|
| `widgetSettings.md` Purpose / key actions | Add `commitShowValues` / `showValues` beside vis dropdowns; snapshot may include optional `showValues`; safeguard list includes `showValues` |
| `widgetVis.md` §2 / §3 | Consequence overlay; still never stores canonical `showValues` |
| `widgetVis.md` after `applyTopNChoice` | New `applyShowValues` subsection (property-only, facet) |
| `widgetVis.md` §7.0 Cognos column | Facet `setContentProperty`, not `_KDB.cognosAPI…` in feature files; overlay rule this delta |
| `writeback.md` vis shape | `{ …, vals? }`; field map row; GET omit when inherit; `0` is a valid present value |
| Restore delta consumed-keys table | `vals` → `showValues` |
| Focus-restore visible set | info / vis / **showValues (not List)** / dim / TopN |

---

## 13. Acceptance

1. New Line widget: values hidden; icon visible; dropdown shows **Diagrammstandard**; no history step; GET omits `vals`.
2. Same widget → Anzeigen: values appear (Line); undo returns to **Diagrammstandard** (inherit, not explicit Ausblenden); redo shows; GET after Anzeigen `vals: 1`; GET after undo omits `vals`.
3. New Column/Bar/Pie: values shown (inherit); dropdown shows **Diagrammstandard**; Ausblenden hides; GET `vals: 0`.
4. Line inherit → switch to Column: values **appear** (inherit follows type); undo visType hides again; no extra showValues history step.
5. Column explicit Ausblenden → switch to Line → back to Column: still hidden.
6. List: icon not visible (settings + focus); gear/other icons unchanged; switching away restores the icon; stored override intact.
7. Widget-property / visType apply / post-render must not stomp an explicit override.
8. kdbControl / Cognos spec not dirtied by this control. No `_KDB.cognosAPI` from these modules. No new facet.
9. Restore: omitted `vals` = inherit; `vals: 0` / `1` explicit. Legacy JSON without `vals` keeps today’s Line-hidden / bar-shown look.
10. When values are **shown** (inherit Column/Bar/Pie, or Anzeigen including Line/Prognose): Cognos `contrast.label.color` and `valueLabels.color` are `true`. Hidden: those keys are not written. List unchanged.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | Draft | coordinator | D2 + List A + icon + history + adapter. Not implemented. |
| 2026-09-02 | Draft → Approved | PO vastenburg | Chat “goedgekeurd”. Execution spec + army next. |
| 2026-09-02 | Approved (amend) | PO vastenburg | Contrast flags when values shown (`contrast.label.color` + `valueLabels.color`). |
| 2026-09-02 | Frozen | PO vastenburg | Cognos ack “het is prima”. Icon `showValues.svg` = **99**. |
| 2026-09-12 | H pending (inherit-row) | PO vastenburg; captain | Diagrammstandard + delete-key. KEEP/`vals`/List stay. Delta: `widgetSettings-family-a-inherit-row-chrome-contractdelta.md`. |
| 2026-09-12 | WP1 chrome words | captain; PO GO | Visible Aus / Standard / Ein (off-left). KEEP/`vals`/List Frozen. |
