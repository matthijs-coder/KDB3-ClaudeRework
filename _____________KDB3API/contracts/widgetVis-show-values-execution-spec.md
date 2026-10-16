# Execution Spec: vis widget “Werte anzeigen” (`showValues`)

> Mechanical spec for grok 4.6 implementers. Architecture lives in `contracts/widgetVis-show-values-contractdelta.md` (**Approved**, PO vastenburg 2026-09-02). Do **not** re-decide D2 inherit, List CSS-hide, persist key `vals`, property-only apply, or adapter reuse.
> No harness. Production tree only: `KDB3/js/**` + `KDB3/css/widgets/*.css`.
> Five writers, **exclusive** allowlists. Echo every MUST in Section A **before** producing files.
> Icon file superseded 2026-09-28: `KDB3/images/adjust.svg`. Glyph `99` / `showValues.svg` is not the toolbar button.

---

**Status:** `Frozen` — PO vastenburg Cognos ack 2026-09-02 (showValues + contrast flags). Dual review: semantic GREEN; mechanical YELLOW MUST (focus vis-type stamp) fixed.
**Module / contract:** `contracts/widgetSettings.md` + `contracts/widgetVis.md` + `contracts/widgetVis-show-values-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-02
**Executing AI:** grok 4.6 army (W1–W5 + focus-stamp fix)
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlists (no two writers on the same file)

### W1 widgetSettings chrome + stamp

**May create:** `KDB3/js/dashboard/widgets/widgetSettings/view/stampPanelVisType.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetSettings/config/controlDefinitions.js`
- `KDB3/js/dashboard/widgets/widgetSettings/config/options.js`
- `KDB3/js/dashboard/widgets/widgetSettings/config/intentDispatchMap.js`
- `KDB3/js/dashboard/widgets/widgetSettings/config/kindToStateKey.js`
- `KDB3/js/dashboard/widgets/widgetSettings/config/selectors.js` (optional attr name only)
- `KDB3/js/dashboard/widgets/widgetSettings/effects/resolveCanonicalVisOptionValue.js`
- `KDB3/js/dashboard/widgets/widgetSettings/view/buildDropdownOptions.js`
- `KDB3/js/dashboard/widgets/widgetSettings/view/placeWidgetSettingsPanel.js`
- `KDB3/css/widgets/widgetSettings.css`

**Must not edit:** `dropdownDefaults.js`, `bindWidgetSettingsPanel.js`, `imagePaths.js`, `populateStaticDropdown.js`, `finalizeVisIntentResult.js` (W2), writeback, widgetVis.

### W2 widgetSettings commit / safeguard / restore

**May create:** `KDB3/js/dashboard/widgets/widgetSettings/view/showValuesDropdownSafeguard.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetSettings/effects/buildWidgetVisSettingsSnapshot.js`
- `KDB3/js/dashboard/widgets/widgetSettings/effects/finalizeVisIntentResult.js`
- `KDB3/js/dashboard/widgets/widgetSettings/effects/applyVisStartupSeedBatch.js`
- `KDB3/js/dashboard/widgets/widgetSettings/effects/restoreCommittedSettingsOnHistoryReplay.js`
- `KDB3/js/dashboard/widgets/widgetSettings/actions/handleParameterSetRestoreBatch.js`
- `KDB3/js/dashboard/widgets/widgetSettings/actions/parameterSetRestoreBatchCommits.js`

**Must not edit:** W1 files (AMD-import `stampPanelVisType` only), `dropdownDefaults.js`, `collectVisualStartupDefaults.js` (`VIS_STARTUP_KINDS` must stay without `showValues`), `handleSeedDefaults.js`, `bindWidgetSettingsPanel.js`.

### W3 widgetVis apply + overlay

**May create:**

- `KDB3/js/dashboard/widgets/widgetVis/effects/applyShowValues.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/handleApplyShowValues.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetVis/config/actionTypes.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/actionRouter.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/handleApplySetting.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/handleApplyStartupSettings.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/parameterSetBindingHelpers.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/readEffectiveSettingsContext.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/applyVisualizationProperties.js`

**Must not edit:** `definitions.js`, `isCompleteSettingsSnapshot.js`, `createWidgetVisReducer.js`, `continueBindingPipeline.js`, `applyPropertyMap.js`, `KDB.js`, `cognosHost/**`, `_KDB.cognosAPI`, focus files (W4), widgetSettings, writeback.

### W4 focus clone + vis CSS

**May edit:**

- `KDB3/js/dashboard/widgets/widgetVis/effects/focusMode/domQueries.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/focusMode/buildFocusPanel.js`
- `KDB3/css/widgets/widgetVis.css`

**Must not edit:** W3 files, widgetSettings CSS (W1), `filterFocusPanelIcons` must **keep** the node (not delete for List).

### W5 writeback `vals`

**May edit:**

- `KDB3/js/core/services/writeback/schema/v3Defaults.js`
- `KDB3/js/core/services/writeback/get/collectors/buildWidgetObject.js`
- `KDB3/js/core/services/writeback/schema/validate/validateWidgetFields.js` (only if needed for `vals` ∈ `{0,1}`)

**Must not edit:** `mapV2VisWidget.js`, `normalizeTabsWidgets.js` (do not treat `0` as omit sentinel), `validateTabsWidgets.js` (catalog-driven), widgetSettings restore (W2), `dropdownDefaults.js`.

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
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc`
13. `_____________KDB3API/contracts/widgetVis-show-values-contractdelta.md` (Approved)
14. This execution spec.

---

## Section B. Folder tree (create / edit)

```
KDB3/js/dashboard/widgets/widgetSettings/
  config/controlDefinitions.js
  config/options.js
  config/intentDispatchMap.js
  config/kindToStateKey.js
  config/selectors.js
  effects/resolveCanonicalVisOptionValue.js
  effects/buildWidgetVisSettingsSnapshot.js
  effects/finalizeVisIntentResult.js
  effects/applyVisStartupSeedBatch.js
  effects/restoreCommittedSettingsOnHistoryReplay.js
  view/buildDropdownOptions.js
  view/placeWidgetSettingsPanel.js
  view/stampPanelVisType.js                    (NEW)
  view/showValuesDropdownSafeguard.js         (NEW)
  actions/handleParameterSetRestoreBatch.js
  actions/parameterSetRestoreBatchCommits.js
KDB3/js/dashboard/widgets/widgetVis/
  config/actionTypes.js
  actions/actionRouter.js
  actions/handleApplySetting.js
  actions/handleApplyStartupSettings.js
  actions/parameterSetBindingHelpers.js
  actions/handleApplyShowValues.js             (NEW)
  effects/readEffectiveSettingsContext.js
  effects/applyVisualizationProperties.js
  effects/applyShowValues.js                   (NEW)
  effects/focusMode/domQueries.js
  effects/focusMode/buildFocusPanel.js
KDB3/js/core/services/writeback/
  schema/v3Defaults.js
  schema/validate/validateWidgetFields.js
  get/collectors/buildWidgetObject.js
KDB3/css/widgets/widgetSettings.css
KDB3/css/widgets/widgetVis.css
```

---

## Section C. Per-file specifications

### Locked product (do not re-open)

- D2: `showValues` absent = inherit catalog (Line/Prognose false; bar/column/pie true). Explicit boolean survives vis-type switch.
- List: CSS-hide icon; keep DOM; do not write `valueLabels.visible` / `labels.visible`.
- Dropdown labels: `Anzeigen` / `Ausblenden`. Title: `Werte anzeigen`.
- History: `widgetSettings_optionSelect`, kind `showValues`, optionValues `on`/`off`.
- Adapter: stamped `visualizationFacet.setContentProperty` only.
- Do not mutate `definitions.js`. Clone layout maps.
- Do not add `showValues` to `dropdownDefaults` or `VIS_STARTUP_KINDS`.
- `isCompleteSettingsSnapshot` stays 3 fields.

### W1 files

#### `config/controlDefinitions.js`

- **Role:** config
- **Lines:** stay well under 150
- Insert in `live[]` immediately after visualization:

```js
{ kind: "showValues", ariaLabel: "showValues", className: "KDB_showValuesButton", icon: "adjust.svg", title: "Zusatzoptionen", dropdownClass: "KDB_showValuesContainer" }
```

- Not in `text[]`. Keep for List (CSS-hide).
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`

#### `config/options.js`

- Add after `visualization` array:

```js
showValues: [
  { key: "on", label: "Anzeigen", value: "on" },
  { key: "off", label: "Ausblenden", value: "off" }
]
```

- **Rules to apply:** `amd.mdc`, `naming.mdc`

#### `config/intentDispatchMap.js`

- `resolveTarget`: add `showValues` to the widgetVis kind or-chain.
- `resolveWidgetVisType`: after topN, before maximize: `if (normalizedKind === "showValues") return "widgetVis/applyShowValues";`
- Optional `normalizeKind`: `"showvalues"` → `"showValues"`.
- **Rules to apply:** `amd.mdc`, `naming.mdc`

#### `config/kindToStateKey.js`

- After visualization: `showValues: "showValues"`
- **Rules to apply:** `amd.mdc`, `naming.mdc`

#### `effects/resolveCanonicalVisOptionValue.js`

- After topN special-case: if kind is `showValues`, map `on`/`true` → `true`, `off`/`false` → `false`. History frames stay `"on"`/`"off"`.
- **Rules to apply:** `amd.mdc`, `naming.mdc`

#### `view/buildDropdownOptions.js`

- In live branch after visualization populate, before dimension: `_populateStaticDropdown(_KDB, _context.root, "showValues", ".KDB_showValuesContainer", false);`
- Do **not** use the visualization/topN default-prepend path.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc` (existing try/catch stays)

#### `view/stampPanelVisType.js` (NEW)

- **Role:** view helper
- **Lines:** target 40–80, hard 150
- **AMD:** `../config/selectors.js`, `../state/ensureWidgetSettingsByWidget.js`, `../config/dropdownDefaults.js`
- **Export:** `stampPanelVisType(_KDB, _panelOrWidgetId)`
- Set `data-kdb-vis-type` on `.KDB_widgetSettings` to the **settings key** (`line` / `list` / `pie` / `stackedbar` / `stackedcolumn` / prognose id as stored in `visType`, else `dropdownDefaults.visualization.useValue`).
- Also mark the inherit-effective dropdown option (`on`/`off`) **without committing** when `showValues` is not a boolean: Line/Prognose → `off`, else (non-list) → `on`. List: still stamp `list`; do not commit.
- try/catch + `console.error("[widgetSettings.stampPanelVisType]", err)`
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `dom.mdc`, `error-handling.mdc`, `feature-structure.mdc` — no nested functions inside the entry.

#### `view/placeWidgetSettingsPanel.js`

- After `panel = _buildWidgetSettingsPanel(...)`, call `stampPanelVisType(_KDB, panel)` (pass widgetId via `_context`).
- New AMD import. File is 33 lines — stay ≤150.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`, `dom.mdc`

#### `css/widgets/widgetSettings.css`

- After the live maximize hide rule (~L377–379), before `.textWidget` block:

```css
.liveWidget .KDB_widgetSettings[data-kdb-vis-type="list"] .KDB_widgetSettingsHeaderRow .KDB_widgetSettingsIcons > .dataWidgetIcon.KDB_showValuesButton {
  display: none;
}
```

- Specificity must beat `.dataWidgetIcon { display: inline-flex }`. No `!important`.
- **Rules to apply:** `dom.mdc` (selectors from existing BEM/KDB classes)

---

### W2 files

#### `effects/buildWidgetVisSettingsSnapshot.js`

- `KIND_TO_CONTROL` after topN: `showValues: "showValues"`
- `isWidgetVisKind`: include `showValues`
- `buildEffectiveVisSnapshot`: include `showValues` **only if** `typeof record.showValues === "boolean"`
- `buildCommittedRestoreBatch`: extra restore entry for `showValues` **only when explicit**
- Watch 150 lines — extract a 10-line helper into this file’s factory scope if needed; do not add `showValues` inherit default.
- **Rules to apply:** `state.mdc` (read-only snapshot), `amd.mdc`, `feature-structure.mdc`

#### `view/showValuesDropdownSafeguard.js` (NEW)

- Copy the `topNDropdownSafeguard.js` pattern: `markShowValuesPending`, `revertShowValuesDropdownFromState`.
- Revert from committed boolean → option `on`/`off`. If inherit (not boolean), select catalog option for current visType (Line/Prognose `off`, else `on`; List still `off` display but icon hidden).
- Pending class: existing `KDB_dropdownPending`.
- **Rules to apply:** `amd.mdc`, `dom.mdc`, `error-handling.mdc`, `state.mdc` (read only)

#### `effects/finalizeVisIntentResult.js`

- If `isWidgetVisKind` already commits `showValues` via generic path, keep that.
- Wire safeguard: pending on start for `showValues`; revert on fail unless `stale: true`.
- After successful **visType** commit, call `stampPanelVisType`.
- File is 133 lines — **do not grow past 150**. Prefer calling the new safeguard file rather than inlining.
- **Rules to apply:** `state.mdc`, `error-handling.mdc`, `amd.mdc`, `feature-structure.mdc`

#### `effects/applyVisStartupSeedBatch.js`

- After successful batch: `stampPanelVisType`. Do not commit `showValues` from startup `reportToSettings`.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`

#### `effects/restoreCommittedSettingsOnHistoryReplay.js`

- Uses `buildCommittedRestoreBatch` (explicit `showValues` included there). Stamp after batch.
- **Rules to apply:** `amd.mdc`

#### `actions/handleParameterSetRestoreBatch.js`

- `VIS_KEYS` after `topn:` add `vals: 1`
- **Rules to apply:** `amd.mdc`

#### `actions/parameterSetRestoreBatchCommits.js`

- In `commitVisAndConsequences` after topN, before ctcol:

```js
if (Object.prototype.hasOwnProperty.call(_entry || {}, "vals")) {
  commitDirect(_KDB, _widgetId, "showValues", _entry.vals === 1);
}
```

- `vals: 0` must become explicit `false`. Missing key → do not commit (inherit).
- Then `stampPanelVisType` if you can resolve the panel; if panel not mounted yet, skip stamp (placeControls will stamp).
- Do **not** dispatch `applyShowValues` here.
- **Rules to apply:** `state.mdc`, `amd.mdc`

---

### W3 files

#### `config/actionTypes.js`

- After `APPLY_TOPN_CHOICE`: `APPLY_SHOW_VALUES: "widgetVis/applyShowValues"`
- **Rules to apply:** `naming.mdc` (slash-style actions), `amd.mdc`

#### `actions/actionRouter.js`

- Import `handleApplyShowValues` after `handleApplySetting`.
- Route `APPLY_SHOW_VALUES` → `_handleApplyShowValues` **after** `APPLY_TOPN_CHOICE`. Do **not** assign to `_handleApplySetting`.
- Existing AMD count is already >10 (grandfathered). This WP adds one import. Do not restructure the router.
- **Rules to apply:** `amd.mdc`, `module-public-api.mdc`

#### `effects/applyShowValues.js` (NEW)

- **Role:** effect
- **AMD:** `./readVisualizationFacet.js`, `../config/visTypes/normalizeVisualizationType.js`
- **Factory-scope helpers (never nested in entry):**
  - `overlayShowValuesOnLayoutMap(_layoutMap, _settings, _normalizedType)` → cloned map
  - `isListType(_normalizedType)`
- Overlay rules:
  - Clone; never mutate the config object.
  - List: omit / do not set `valueLabels.visible` and `labels.visible`.
  - Else if `typeof settings.showValues === "boolean"`: set both keys to that boolean.
  - Else: leave catalog clone as-is (inherit).
- `applyShowValues(_KDB, _widgetId, _nextValue, _normalizedVisType)`:
  - List → `{ ok: true, skipped: true, reason: "list" }`
  - Else both `setContentProperty` via `_readVisualizationFacet(_KDB)`.
  - Missing facet → `{ ok: false, errorCode: "WIDGET_VIS_FACET_MISSING" }` (or existing missing-facet code if one exists — reuse, do not invent a second taxonomy).
  - try/catch + `console.error("[widgetVis.applyShowValues]", err)`
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`, `cognos-adapter.mdc` (stamp only, no `_KDB.cognosAPI`, no new facet), `feature-structure.mdc`

#### `actions/handleApplyShowValues.js` (NEW)

- Pattern: `handleMaximizeToggle` (gates + normalize), **not** `handleApplySetting`.
- Read `payload.nextValue` boolean; `settingsSnapshot.visType` for List no-op.
- No `buildPlan` / `applyBinding` / bind `opSeq` bump.
- Success: `reportToSettings: { control: "showValues", previousValue, nextValue }`
- Disposed: controller already guards; still fail closed if no vis record.
- **Rules to apply:** `module-public-api.mdc`, `error-handling.mdc`, `state.mdc` (no settings writes), `amd.mdc`

#### `effects/applyVisualizationProperties.js`

- 147 lines — **must extract overlay** into `applyShowValues.js` (`overlayShowValuesOnLayoutMap`) so this file stays ≤150.
- Add AMD import of overlay helper.
- After resolving layout maps, before `setContentProperty`: `layoutMap = overlayShowValuesOnLayoutMap(layoutMap, input.settings, normalizedVisType)`
- `APPLY_ON_REASON`: add `showValues: true` after `visType`.
- Skip gate: `reason === "showValues"` must apply. Post-render already `force: true` — overlay must still run.
- **Rules to apply:** `amd.mdc`, `feature-structure.mdc` (≤150), `cognos-adapter.mdc`

#### `actions/handleApplySetting.js`

- In `resolveSettings`, copy `showValues` when `typeof snapshot.showValues === "boolean"`.
- Do not add to `REASON_BY_CONTROL` / `CONTROL_BY_ACTION`.
- Completeness check unchanged.
- **Rules to apply:** `state.mdc`, `amd.mdc`

#### `actions/handleApplyStartupSettings.js`

- `resolveSettingsFromSnapshot`: copy optional boolean `showValues`. Completeness unchanged.
- **Rules to apply:** `state.mdc`, `amd.mdc`

#### `actions/parameterSetBindingHelpers.js`

- `readCommittedSettings`: add `showValues: record.showValues` when boolean.
- **Rules to apply:** `state.mdc`, `amd.mdc`

#### `effects/readEffectiveSettingsContext.js`

- Pass optional boolean `showValues` on both snapshot and public-api reads. Do not default it.
- **Rules to apply:** `state.mdc`, `amd.mdc`

---

### W4 files

#### `effects/focusMode/domQueries.js`

- `filterFocusPanelIcons` keep-list: add `"KDB_showValuesButton"` after `KDB_visualizationsButton`.
- Do **not** delete List icons here.
- **Rules to apply:** `dom.mdc`, `amd.mdc`

#### `effects/focusMode/buildFocusPanel.js`

- After clone, set `data-kdb-vis-type` from the source settings panel (clone usually copies attrs; set explicitly anyway).
- Re-stamp if visType can change while focused (reuse path).
- **Rules to apply:** `dom.mdc`, `amd.mdc`, `error-handling.mdc`

#### `css/widgets/widgetVis.css`

- After focus maximize/unmaximize hide:

```css
.KDB_focusModeSettingsPanel[data-kdb-vis-type="list"] .dataWidgetIcon.KDB_showValuesButton {
  display: none;
}
```

- Live bar hide stays in `widgetSettings.css`. `!important` only if an existing focus rule would otherwise win (match maximize lesson). Prefer no `!important` if 0,6,0 wins.
- **Rules to apply:** `dom.mdc`

---

### W5 files

#### `schema/v3Defaults.js`

- `WIDGET_FIELDS.vis` after `topn`, before `bgcol`:

```js
vals: Object.freeze({ type: "number", required: false })
```

- **Rules to apply:** `amd.mdc`, `naming.mdc`

#### `get/collectors/buildWidgetObject.js`

- After optional `topn` assign, **not** via `assignOptionalString`:

```js
if (typeof settings.showValues === "boolean") {
  common.vals = settings.showValues ? 1 : 0;
}
```

- Omit when inherit. Emit `0` when explicit false.
- **Rules to apply:** `amd.mdc`, `state.mdc` (read settings only)

#### `schema/validate/validateWidgetFields.js`

- If easy without blowing 150: when field key is `vals`, require `value === 0 || value === 1`. Else leave number type (0 already valid) and document the gap.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`

---

## Section D. Reducer behaviour

No new `widgetVis` reducer cases. `widgetSettings` commit uses existing `commitWidgetSettingValue` (`showValues` boolean).

| Action | Trigger | Reducer / effect | History |
|---|---|---|---|
| `widgetVis/applyShowValues` | settings dropdown / replay | property write only | none in widgetVis |
| `widgetSettings` commit after success | `finalizeVisIntentResult` | `showValues: true\|false` | `widgetSettings_optionSelect` if user |

---

## Section E. Published selectors

No new published selectors. Panel stamp reads `byWidget[id].visType` / `showValues` privately.

---

## Section F. Public API wiring

- `_KDB.api.widgetVis.dispatch({ type: "widgetVis/applyShowValues", ... })` via existing dispatch surface.
- `_KDB.api.widgetSettings` unchanged shape.
- `_KDB.api.properties` / `_KDB.services.cognosHost`: **no** new keys. Stamp `visualizationFacet` already on widgetVis runtime.

---

## Section G–I. Harness / mocks

None. No harness WP.

---

## Section J. Acceptance (self-check)

1. Every allowlisted file exists or is documented omitted.
2. Per-file `Rules to apply` satisfied; no file >150 JS lines without a split already specified.
3. Full-compact AMD; no nested functions in new entry bodies.
4. No `_KDB.cognosAPI` in edited feature files.
5. No `definitions.js` mutation; overlay clones.
6. `dropdownDefaults` / `VIS_STARTUP_KINDS` / `isCompleteSettingsSnapshot` untouched.
7. GET omits `vals` when inherit; emits `0`/`1` when explicit.
8. List CSS-hides icon; focus keep-list includes the class; List apply is no-op.
9. Undo/redo of Anzeigen/Ausblenden goes through `widgetSettings_optionSelect` → `applyShowValues`.
10. Report: Section A echo + file checklist + deviations.

---

## Section K. Forbidden actions

- Modify `.mdc` files; `_executionSpecTemplate.md`; `_archive` contracts.
- Edit `KDB.js`, `definitions.js`, `widgetBindingPlan/**`, `mapV2VisWidget.js`, `createWidgetVisReducer.js` canonical `showValues`.
- New events, new history key, new cognosHost facet, `_KDB.superUser`, `classList` on `#main`.
- Seed/commit inherit on startup.
- Grey-out List icon instead of CSS hide.
- Commit, push, git config.
- Invent architecture; stop and report.

---

## Section L. Reporting template

1. Pre-flight echo (14 numbered summaries).
2. File checklist (path, line count, matches spec | deviation).
3. Deviations with motivation.
4. Self-verification vs Section J.
5. Open questions.

---

## Section M. Reviewer handoff

Captain launches **fresh** subagents (not the writers) for mechanical MUST review and semantic contract-vs-code (before was the scout; after = this). Then PO Cognos checklist from the delta §13.
