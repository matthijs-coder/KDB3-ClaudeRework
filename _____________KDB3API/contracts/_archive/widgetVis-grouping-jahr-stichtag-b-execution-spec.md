# Execution Spec: vis grouping Jahr / Stichtag — Step B

> Mechanical spec for grok 4.6 army. Architecture lives in `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` **§11** (Step B Draft). Family A: `contracts/widgetSettings-setting-family-contractdelta.md`.
> Do **not** re-decide grain-first, List XOR, Prognose PKZ, Family A, Q6, history (C), writeback (D), decimals/`setFormat`.
> No harness. Production tree only. Captain does not write these JS/CSS files.
> Echo Section A **before** producing files.

---

**Status:** `Executed` — W1–W3 landed; dual JS GREEN/GREEN 2026-09-11. Await PO canvas before grouping-delta Step B `Implemented`.
**Module / contract:** `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` §11
**Phase:** `extension` (Step B only)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-11
**Executing AI:** grok 4.6 army
**Reviewer:** captain + dual grok 4.6 review

---

## Waves (do not invert)

| Wave | Writers | Starts when |
|---|---|---|
| **W1-CHROME** | one writer | spec Ready |
| **W1-CSS** | one writer | spec Ready (∥ CHROME; class names locked below) |
| **W2-APPLY** | one writer | W1-CHROME done |
| **W3-STAMP** | one writer | W1-CHROME done (∥ W2; no shared files) |

---

## Exclusive allowlists (no two writers on the same file)

### W1-CHROME — maps + icon definition

**May edit:**

- `KDB3/js/dashboard/widgets/widgetSettings/config/controlDefinitions.js`
- `KDB3/js/dashboard/widgets/widgetSettings/config/options.js`
- `KDB3/js/dashboard/widgets/widgetSettings/config/intentDispatchMap.js`
- `KDB3/js/dashboard/widgets/widgetSettings/config/kindToStateKey.js`
- `KDB3/js/dashboard/widgets/widgetVis/config/actionTypes.js`

**Must not edit:** CSS, apply/snapshot, stamp, router, focus, dropdown populate, `imagePaths.js`.

### W1-CSS — hide keep-DOM

**May edit:**

- `KDB3/css/widgets/widgetSettings.css`
- `KDB3/css/widgets/widgetVis.css`

**Must not edit:** any JS.

### W2-APPLY — full rebind path

**May edit:**

- `KDB3/js/dashboard/widgets/widgetVis/actions/handleApplySetting.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/actionRouter.js` (one route line; **no new import**)
- `KDB3/js/dashboard/widgets/widgetVis/actions/handleApplyStartupSettings.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/parameterSetBindingHelpers.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/readEffectiveSettingsContext.js`
- `KDB3/js/dashboard/widgets/widgetSettings/effects/buildWidgetVisSettingsSnapshot.js`

**Must not edit:** W1 files, stamp, CSS, focus, `isCompleteSettingsSnapshot.js`, `handleApplyShowValues.js`, `applyVisualizationProperties.js`, `finalizeVisIntentResult.js`, `dispatchWidgetSettingsIntent.js`, `commitWidgetSettingValue.js`, `resolveCanonicalVisOptionValue.js`.

### W3-STAMP — planner stamp + inherit mark + populate + focus

**May edit:**

- `KDB3/js/dashboard/widgets/widgetVis/effects/buildBindingSpec.js`
- `KDB3/js/dashboard/widgets/widgetSettings/view/stampPanelVisType.js`
- `KDB3/js/dashboard/widgets/widgetSettings/view/buildDropdownOptions.js`
- `KDB3/js/dashboard/widgets/widgetVis/effects/focusMode/domQueries.js`

**Must not edit:** W1/W2 files, `bindWidgetSettingsPanel.js`, `placeWidgetSettingsPanel.js`, `imagePaths.js`, `mapSettings` keys, `dropdownDefaults.js`.

### Nobody in B

`bindWidgetSettingsPanel.js`, `placeWidgetSettingsPanel.js`, `imagePaths.js`, `dropdownDefaults.js`, `collectVisualStartupDefaults.js`, `isCompleteSettingsSnapshot.js`, `handleApplyShowValues.js`, `applyVisualizationProperties.js`, `finalizeVisIntentResult.js`, `dispatchWidgetSettingsIntent.js`, `commitWidgetSettingValue.js`, `resolveCanonicalVisOptionValue.js`, writeback, history, `__orchestratorConfig.js`, `.mdc`, grouping-delta (captain-only).

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
12. `_____________KDB3API/contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` (§2 Family A + **§11** only)
13. `_____________KDB3API/contracts/widgetSettings-setting-family-contractdelta.md` (§3.1 + §5 checklist)
14. This execution spec.

Also echo: Family A grouping — absent inherit; click writes token; List/Prognose hide keep-DOM; full rebind; stamp `dataConfig.grouping`; no third safeguard; no `Gruppierung*`.

---

## Section B. Files

```
KDB3/js/dashboard/widgets/widgetSettings/config/
  controlDefinitions.js
  options.js
  intentDispatchMap.js
  kindToStateKey.js

KDB3/js/dashboard/widgets/widgetVis/config/
  actionTypes.js

KDB3/js/dashboard/widgets/widgetVis/actions/
  handleApplySetting.js
  handleApplyStartupSettings.js
  parameterSetBindingHelpers.js
  actionRouter.js

KDB3/js/dashboard/widgets/widgetVis/effects/
  readEffectiveSettingsContext.js

KDB3/js/dashboard/widgets/widgetSettings/effects/
  buildWidgetVisSettingsSnapshot.js

KDB3/js/dashboard/widgets/widgetVis/effects/
  buildBindingSpec.js
  focusMode/domQueries.js

KDB3/js/dashboard/widgets/widgetSettings/view/
  stampPanelVisType.js
  buildDropdownOptions.js

KDB3/css/widgets/
  widgetSettings.css
  widgetVis.css
```

---

## Section C. Per-wave must-do

### W1-CHROME

1. `controlDefinitions.js` `live[]`: insert **after** `visualization`, **before** `showValues`:

```js
{ kind: "grouping", ariaLabel: "grouping", className: "KDB_groupingButton", icon: "grouping.svg", title: "Zeitebene", dropdownClass: "KDB_groupingContainer" }
```

2. `options.js` add (no `isDefault`):

```js
grouping: [
  { key: "stichtag", label: "Stichtag", value: "stichtag" },
  { key: "jahr", label: "Jahr", value: "jahr" }
]
```

3. `intentDispatchMap.js`: add `grouping` to the widgetVis target `if`; `resolveWidgetVisType` return `"widgetVis/applyGrouping"`. No `normalizeKind` alias.
4. `kindToStateKey.js`: `grouping: "grouping"`.
5. `actionTypes.js`: `APPLY_GROUPING: "widgetVis/applyGrouping"`.

- **Rules to apply:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc` (pure config). Hardcoded DE. Never `Gruppierung*`. No `labels.de`.

### W1-CSS

Hide keep-DOM (do not `removeChild`). Mirror the List showValues pattern.

`widgetSettings.css` (next to the List showValues rule ~381):

```css
.liveWidget .KDB_widgetSettings[data-kdb-vis-type="list"] .KDB_widgetSettingsHeaderRow .KDB_widgetSettingsIcons > .dataWidgetIcon.KDB_groupingButton,
.liveWidget .KDB_widgetSettings[data-kdb-vis-type="prognose"] .KDB_widgetSettingsHeaderRow .KDB_widgetSettingsIcons > .dataWidgetIcon.KDB_groupingButton,
.liveWidget .KDB_widgetSettings[data-kdb-vis-type="com.ibm.vis.custom.prognoseyear"] .KDB_widgetSettingsHeaderRow .KDB_widgetSettingsIcons > .dataWidgetIcon.KDB_groupingButton,
.liveWidget .KDB_widgetSettings[data-kdb-vis-type="com.ibm.vis.custom.prognoseyearlinechart"] .KDB_widgetSettingsHeaderRow .KDB_widgetSettingsIcons > .dataWidgetIcon.KDB_groupingButton {
  display: none;
}
```

`widgetVis.css` (next to focus List showValues ~40):

```css
.KDB_focusModeSettingsPanel[data-kdb-vis-type="list"] .dataWidgetIcon.KDB_groupingButton,
.KDB_focusModeSettingsPanel[data-kdb-vis-type="prognose"] .dataWidgetIcon.KDB_groupingButton,
.KDB_focusModeSettingsPanel[data-kdb-vis-type="com.ibm.vis.custom.prognoseyear"] .dataWidgetIcon.KDB_groupingButton,
.KDB_focusModeSettingsPanel[data-kdb-vis-type="com.ibm.vis.custom.prognoseyearlinechart"] .dataWidgetIcon.KDB_groupingButton {
  display: none;
}
```

- **Rules to apply:** `dom.mdc` (class names match controlDefinitions). No JS.

### W2-APPLY

1. `handleApplySetting.js` (146): **do not** add `REASON_BY_CONTROL` / `CONTROL_BY_ACTION` / kind-parse rows. `payload.control` is already `"grouping"` from snapshot (`buildDownstreamIntentAction`); reason fallthrough is `control`. Add **exactly two one-liners** in `resolveSettings` (3-line `if`s → 152). Copy `base.grouping` if token; if control is `grouping` and `nextValue` is a token, write that. Stay **≤150**. AMD 7 unchanged. Still `runBindingPipeline`.
2. Same optional-copy (token only), **in-file** on the three allowlisted homes: `readEffectiveSettingsContext.js`, `handleApplyStartupSettings.js` `resolveSettingsFromSnapshot`, `parameterSetBindingHelpers.js` `readCommittedSettings`. Do **not** create `copyOptionalGrouping.js`. Do **not** seed. Do **not** add `VIS_STARTUP_KINDS`.
3. `actionRouter.js`: `routes[_actionTypes.APPLY_GROUPING] = _handleApplySetting;` — **no 15th import**.
4. `buildWidgetVisSettingsSnapshot.js` (142): `KIND_TO_CONTROL.grouping = "grouping"`; `isWidgetVisKind` includes `grouping`; **extend** existing `appendExplicitShowValues` with token copy (do **not** add `appendExplicitGrouping`). `buildStartupBatch` skip: `control !== "showValues" && control !== "grouping"`. Restore: after the showValues `if` push, one more `if (snapshot.grouping === "stichtag" || snapshot.grouping === "jahr")` push `buildRestoreControlEntry("grouping", snapshot.grouping)`. Stay ≤150.

- **Rules to apply:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc` (150); `error-handling.mdc` (keep existing try/catch on loading helpers). No `_KDB.cognosAPI`. No third safeguard file. No `resolveApplySettingSettings.js`.

### W3-STAMP

1. `buildBindingSpec.js` (149/150): after the spec object, **one** line — `if (grouping === "stichtag" || grouping === "jahr") { spec.dataConfig.grouping = grouping; }` File must end **≤150**. `mapSettings` unchanged (no grouping). AMD stays 5.
2. `stampPanelVisType.js`:
   - `SETTINGS_VIS_KEYS` add `"com.ibm.vis.custom.prognoseyear": "prognose"`, `"com.ibm.vis.custom.prognoseyearlinechart": "prognose"`, `prognose: "prognose"`.
   - Import `"../../widgetVis/config/resolveVisualizationBindingConfig.js"` (AMD 3→4). Call `resolveDefaultGrain(record.visType, _KDB)` — **raw** visType, not the stamp short.
   - New factory-scope `markGroupingOption(_panel, _token)`: query kind attr `grouping` or `.KDB_groupingContainer`; same selected-class pattern as showValues.
   - **Invert** the L28–30 early-return: never `return` before the grouping mark. If `record.showValues` is boolean, skip only `markShowValuesOption`. Then always: if `record.grouping` is `stichtag`\|`jahr`, mark that; else if `defaultGrain` is a string, mark that; else skip.
   - Do **not** write `record.grouping`. Do **not** reuse `inheritKey` / `markShowValuesOption` for grouping.
   - Stay ≤150.
3. `buildDropdownOptions.js`: live branch add `_populateStaticDropdown(_KDB, _context.root, "grouping", ".KDB_groupingContainer", false);`
4. `domQueries.js` keep-list: add `className.indexOf("KDB_groupingButton") === -1 &&`.

- **Rules to apply:** `amd.mdc`; `naming.mdc`; `feature-structure.mdc` (150); `error-handling.mdc` (stamp already try/catch); `dom.mdc` (focus keep-list). No `_KDB.cognosAPI`. No `bindWidgetSettingsPanel.js`.

---

## Section D–I

Not a new module. No reducer, no new `_KDB.api`, no harness, no mock. No history key (C). No `grp` (D).

---

## Section J. Acceptance

1. `live[]` has grouping after visualization; title `Zeitebene`; icon `grouping.svg`; options Stichtag/Jahr; no `Gruppierung*`; not in `labels.de`.
2. Intent maps to `widgetVis/applyGrouping` → `handleApplySetting` (full rebind). Missing any map → `scaffoldNoop` = FAIL.
3. `settings.grouping` written only after confirmed apply; tokens only. visType switch does not CLEAR.
4. Unset: stamp marks `defaultGrain`; no seed. Click on displayed default writes the token.
5. List + Prognose: icon in DOM, `display:none` (canvas + focus). `data-kdb-vis-type="prognose"` for both IBM ids.
6. `dataConfig.grouping` stamped iff token; planner pack follows it. `mapSettings` has no grouping.
7. Focus keep-list includes `KDB_groupingButton`.
8. `isCompleteSettingsSnapshot` unchanged. `APPLY_ON_REASON` unchanged. No third safeguard. No `bindWidgetSettingsPanel` / `imagePaths` / `dropdownDefaults` edit.
9. Caps: `buildBindingSpec` ≤150 AMD 5; `handleApplySetting` ≤150 AMD 7 (no extract); snapshot ≤150; stampPanel ≤150 AMD 4; `actionRouter` no new import; `finalizeVisIntentResult` AMD 9 unchanged. Sibling copies (effective / startup / parameterSet) pass explicit grouping; inherit stays omitted.
10. Report: Section A echoes + file table (path, lines, matches spec | deviation).

---

## Section K. Forbidden

- Edit `.mdc`, templates, Approved A text except captain §11.
- Legacy trees. Commit / push / git config.
- Seed grouping. `"none"` inherit. List XOR. Prognose `grains.jahr`.
- Third safeguard. `handleApplyGrouping.js`. Property-only apply. Grouping in `APPLY_ON_REASON`.
- Merge grouping into showValues `inheritKey`.
- `Gruppierung*` chrome. `labels.de` copy.
- Skip Section A echo.

---

## Section L. Writer report

1. Pre-flight echo (14 items + Family A sentence).
2. File checklist (path, lines, matches | deviation).
3. Deviations with motivation.
4. Section J pass/fail.
5. Open questions (do not silently close Q6).

---

## Section M. Captain / dual review

1. Confirm echoes.
2. Read every allowlisted file; `ReadLints` on `.js`.
3. Grep: `applyGrouping` wired; no `scaffoldNoop` for grouping; `dataConfig.grouping` stamp; no `Gruppierung`; no third safeguard; `APPLY_ON_REASON` unchanged; `bindWidgetSettingsPanel` untouched.
4. Dual review before B Implemented.
5. Do not start C/D/E JS.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-11 evening | `Draft` | captain | Wait PO §11 + Zeitebene / options lock. |
| 2026-09-11 evening | Dual r1 GREEN/GREEN | army | NITs folded into §11 + this spec. Canonical no-edit. |
| 2026-09-11 evening | Dual r2 GREEN/GREEN | army | NITs: drop canonical step 5; in-file copies only; restore push specified. |
| 2026-09-11 evening | Dual r3 GREEN/GREEN | army | NIT: startup skip grouping; stamp barrel path. |
| 2026-09-11 evening | `Draft` → `Ready for execution` | captain (PO auto-approve on 3× green) | Execute W1∥ then W2∥W3. |
| 2026-09-11 evening | `Ready for execution` → `Executed` | captain; army W1–W3 | Dual JS GREEN/GREEN. Await canvas. |
