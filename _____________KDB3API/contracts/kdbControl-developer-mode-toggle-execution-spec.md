# Execution Spec: kdbControl developer-mode toggle + SuperUser visibility (+ Slice B)

> Mechanical spec for grok 4.6 implementers. Architecture lives in `kdbControl-developer-mode-toggle-contractdelta.md` (**Approved**, PO vastenburg 2026-09-02, includes Slice B). Do **not** re-decide persist SSOT, `hidSu` reuse, SuperUser match, leftover-unhide, Cognos spec write, or gear-lock.
> No harness. Production tree only: `KDB3/js/**` + `KDB3/css/kdb-control/panels.css`.
> Five writers, **exclusive** allowlists. Echo every MUST in Section A **before** producing files.

---

**Status:** `Frozen` — PO vastenburg Cognos ack 2026-09-02 (toggle + chrome + duplicate-label polish). Dual review: semantic GREEN; mechanical YELLOW (grandfathered only, no MUST hole).
**Module / contract:** `contracts/kdbControl.md` + `contracts/kdbControl-developer-mode-toggle-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-02
**Executing AI:** grok 4.6 army (W1–W5)
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlists (no two writers on the same file)

### W1 properties

**May create:** `KDB3/js/core/properties/applyDeveloperMode.js`

**May edit:**

- `KDB3/js/core/properties/applyHideWidgetsToggleChange.js`
- `KDB3/js/core/properties/__orchestratorProperties.js`
- `KDB3/js/core/properties/subscribeHideWidgetsToggleProperty.js`

**Must not edit:** `KDB.js`, `loadToggleProperties.js`, `loadObjectProperties.js`, `developerModeClass.js` (read-only for class name `KDB_developerMode`), kdbControl/**, writeback/**, metricsTree/**, `core/utils/**`.

### W2 writeback schema

**May edit:**

- `KDB3/js/core/services/writeback/schema/v3Defaults.js`
- `KDB3/js/core/services/writeback/get/collectors/collectCanvasSettings.js`

**Must not edit:** restore catalog (`buildParameterSetRestoreActions.js` is W3), validate internals except via catalog data in `v3Defaults.js`, kdbControl/**.

### W3 kdbControl state / history / restore / mount seed

**May edit:**

- `KDB3/js/dashboard/canvas/kdbControl/events/eventNames.js`
- `KDB3/js/dashboard/canvas/kdbControl/state/initialState.js`
- `KDB3/js/dashboard/canvas/kdbControl/state/copyState.js`
- `KDB3/js/dashboard/canvas/kdbControl/state/selectors.js`
- `KDB3/js/dashboard/canvas/kdbControl/state/reduceSettingsActions.js`
- `KDB3/js/dashboard/canvas/kdbControl/state/createKdbControlReducer.js`
- `KDB3/js/dashboard/canvas/kdbControl/actions/applySettingsAction.js`
- `KDB3/js/dashboard/canvas/kdbControl/actions/buildParameterSetRestoreActions.js`
- `KDB3/js/dashboard/canvas/kdbControl/effects/mountKdbControlController.js`
- `KDB3/js/dashboard/canvas/kdbControl/history/isHistoryTrackedSettingsTarget.js`
- `KDB3/js/dashboard/canvas/kdbControl/history/readSettingsTargetSnapshot.js`
- `KDB3/js/dashboard/canvas/kdbControl/history/resolveHistoryTargetFromAction.js`
- `KDB3/js/dashboard/canvas/kdbControl/history/applyControlSettingsHistoryReplay.js`

**Must not edit:** `handleParameterSetRestore.js` (generic plan runner — stamp `source: "writebackRestore"` on the **action payload** in the restore catalog, not here), `pushSettingsHistoryStep.js`, `buildControlSettingsHistoryStep.js` (already honor `commitOptions.skipHistory`; new target is enough), UI/CSS, `settingsPostDispatchSideEffects.js` (W4), `fillDashboardSettings.js` (W4).

### W4 kdbControl UI / effects / visibility

**May create:** `KDB3/js/dashboard/canvas/kdbControl/effects/applyDeveloperModeToggleVisibility.js`

**May edit:**

- `KDB3/js/dashboard/canvas/kdbControl/framework/fillDashboardSettings.js`
- `KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkKdbActionToggles.js`
- `KDB3/js/dashboard/canvas/kdbControl/framework/syncFrameworkSwitchCheckboxes.js`
- `KDB3/js/dashboard/canvas/kdbControl/effects/settingsPostDispatchSideEffects.js`
- `KDB3/js/dashboard/canvas/kdbControl/effects/__orchestratorEffects.js`
- `KDB3/css/kdb-control/panels.css`

**Must not edit:** state/history/restore files (W3), properties internals (call `_KDB.api.properties.applyDeveloperMode` only), `core/utils/**` (W5 creates; AMD-import only), `fillGraphSettings.js`, `hideWidgetSettingsButtons` sister path except leaving it untouched.

### W5 shared utils + Slice B metricsTree

**May create:**

- `KDB3/js/core/utils/isRightAllowed.js`
- `KDB3/js/core/utils/readFirstRowScalar.js`
- `KDB3/js/dashboard/metricsTree/effects/readSuperUserAllowed.js`

**May edit:**

- `KDB3/js/dashboard/metricsTree/effects/runMetricsTreeMount.js`
- `KDB3/js/dashboard/metricsTree/state/buildMetricsTreeSources.js`
- `KDB3/js/dashboard/metricsTree/state/buildMetricsTreeNodes.js`

**Must not edit:** `core/utils/__orchestratorUtils.js` (already **10** AMD imports — do not register the new utils on `_KDB.utils`), `specialSingleSelect/**` (copy the scalar rule; do **not** import that module), `KDB3/js/core/config/tables.js` (`superuser` already exists), `buildMetricsTreeLeafNode.js`.

### Global must-not (all writers)

`KDB.js`, `.cursor/rules/*.mdc`, `contracts/_archive/**` as live authority, `contracts/_template.md`, `_executionSpecTemplate.md`, git commit/push, `helpers/` `common/` `shared/` folders, leftover `Support`, ES modules in `KDB3/js/**`, `_KDB.superUser` writes/reads (except deleting the read in Slice B), `_KDB.api.canvas` for this flag, `_KDB.cognosAPI` / `__getDashboardAPI`, `content.setPropertyValue` / Cognos spec write, `classList` on `#main` from kdbControl, `ensureFreshRows` / `reloadTable` / `abortTable("superuser")`, specialSingleSelect `TABLE_KEYS`, `hidWs` / Diagramme settings-buttons / gear lock, `KDB_superuser` CSS, `eventSubscribe.md`, new events.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB` namespaces; no `_KDB.superUser`; `_KDB.api.properties` is the contracted narrow surface for this WP; no `_KDB.data`.
2. `_____________KDB3API/.cursor/rules/state.mdc` — one writer per subtree; kdbControl reducer writes `isDeveloperMode`; properties writes class + `_KDB.properties.KDBHideWidgetsToggle`; no foreign `_KDB.state.tableData` writes.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — abort `developerModeToggleVisibility` via existing `abortControllers` map; never `abortTable`.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — kdbControl stays dispatch-only; properties API is `{ applyDeveloperMode }` only, not a second dispatch surface, not `_KDB.services.properties`.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events; no `tableData:loadFinished` / `properties:hideWidgetsToggled`.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — 150/120/60/10 limits; no vague folders; Module Contract First (delta already approved).
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files/ids; slash-style actions; colon-style events (none new); `_` prefix on AMD factory params only.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on named executables and async effects; pure reducers and one-liner utils exempt.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — kdbControl does not query `#main`; class host stays properties via `dashboardClassHost` selector.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; named helpers at factory scope; no nested subfunctions in entry/callbacks; no ES modules.
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — kdbControl/metricsTree/writeback collectors must not call `_KDB.cognosAPI` or `__getDashboardAPI`; no new cognosHost facet.
12. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — kdbControl keeps `idle|mounted|error|disposed`; do not invent a lifecycle for the visibility gate (CSS class only).
13. `_____________KDB3API/contracts/kdbControl-developer-mode-toggle-contractdelta.md` — polarity `true` = developer ON; SuperUser fail-closed; `hidSu` ignored; Slice B explicit boolean.
14. This execution spec.

---

## Section B. Folder tree (create order)

```
KDB3/js/core/utils/
  isRightAllowed.js                            (new, W5)
  readFirstRowScalar.js                        (new, W5)
KDB3/js/core/properties/
  applyDeveloperMode.js                        (new, W1)
  applyHideWidgetsToggleChange.js              (edit, W1)
  __orchestratorProperties.js                  (edit, W1)
  subscribeHideWidgetsToggleProperty.js        (edit, W1)
KDB3/js/core/services/writeback/schema/
  v3Defaults.js                                (edit, W2)
KDB3/js/core/services/writeback/get/collectors/
  collectCanvasSettings.js                     (edit, W2)
KDB3/js/dashboard/canvas/kdbControl/
  events/eventNames.js                         (edit, W3)
  state/initialState.js                        (edit, W3)
  state/copyState.js                           (edit, W3)
  state/selectors.js                           (edit, W3)
  state/reduceSettingsActions.js               (edit, W3)
  state/createKdbControlReducer.js             (edit, W3)
  actions/applySettingsAction.js               (edit, W3)
  actions/buildParameterSetRestoreActions.js   (edit, W3)
  effects/mountKdbControlController.js         (edit, W3)
  history/isHistoryTrackedSettingsTarget.js    (edit, W3)
  history/readSettingsTargetSnapshot.js        (edit, W3)
  history/resolveHistoryTargetFromAction.js    (edit, W3)
  history/applyControlSettingsHistoryReplay.js (edit, W3)
  framework/fillDashboardSettings.js           (edit, W4)
  framework/bindFrameworkKdbActionToggles.js   (edit, W4)
  framework/syncFrameworkSwitchCheckboxes.js   (edit, W4)
  effects/settingsPostDispatchSideEffects.js   (edit, W4)
  effects/applyDeveloperModeToggleVisibility.js (new, W4)
  effects/__orchestratorEffects.js             (edit, W4)
KDB3/css/kdb-control/panels.css                (edit, W4)
KDB3/js/dashboard/metricsTree/effects/
  readSuperUserAllowed.js                      (new, W5)
  runMetricsTreeMount.js                       (edit, W5)
KDB3/js/dashboard/metricsTree/state/
  buildMetricsTreeSources.js                   (edit, W5)
  buildMetricsTreeNodes.js                     (edit, W5)
```

---

## Section C. Per-file specifications

### W5 — utils (create first in this slice; other writers may AMD-import)

#### `KDB3/js/core/utils/isRightAllowed.js`

- **Role:** pure helper
- **Lines:** target 15 (hard 40)
- **AMD imports:** none (`define([], ...)`)
- **Entry:** `__controller(_rawValue)` **or** named `isRightAllowed(_rawValue)` returned as the module value
- **Body:** `return _rawValue === 1 || _rawValue === "1" || _rawValue === true;`
- **Do not** treat `"true"` string / `yes` as allowed (copy special-rights, not properties toggle normalize).
- **Rules to apply:** `amd.mdc`; `naming.mdc`; `error-handling.mdc` (one-liner helper exempt).

#### `KDB3/js/core/utils/readFirstRowScalar.js`

- **Role:** pure helper
- **Lines:** target 40 (hard 80)
- **AMD imports:** none
- **Entry:** `readFirstRowScalar(_rows)`
- **Body (copy `readSpecialRightsFromTableData.js` factory helper; do not import that file):**
  1. missing/empty `_rows` → `null`
  2. first row, first `Object.keys` column
  3. if cell is object: `cell.use` → `cell.u` → `cell.d` (nullish checks `!= null`)
  4. else return primitive cell
- **Rules to apply:** `amd.mdc`; `naming.mdc`; `error-handling.mdc` (pure helper exempt).

Do **not** add either file to `__orchestratorUtils.js`. Consumers AMD-import the files.

---

### W1 — properties

Polarity: **`enabled === true` means developer mode ON** = class `KDB_developerMode` present on `dashboardClassHost` (`#main` via selector). Persist-id `KDBHideWidgetsToggle` **unchanged**.

#### `KDB3/js/core/properties/applyHideWidgetsToggleChange.js`

- **Role:** controller (Cognos **re-read** only)
- **Lines:** stay ≤ 150 (today ~86)
- **Keep** factory-scope `normalizeToggleValue`, `readDashboardClassHostSelector`, `resolveDashboardClassHost`, `applyDeveloperModeClass`, `__controller(_KDB)` (always re-reads `_readPropertyValue(_KDB, "KDBHideWidgetsToggle")`, writes `_KDB.properties.KDBHideWidgetsToggle`, applies class). Live arity is **`(_KDB)` only** — do not preserve a fictional payload/`enabled` argument.
- **Change return:** keep returning `__controller` **and** attach `__controller.applyClass = applyDeveloperModeClass` (same pattern as other AMD attachments). Do not rename `DEVELOPER_MODE_CLASS`.
- **Do not** take `enabled` here. **Do not** echo kdbControl here.
- **Rules to apply:** `amd.mdc`; `dom.mdc` (class host via selector, not hardcoded `#main` string if selector exists); `error-handling.mdc`; `cognos-adapter.mdc` (keep using existing `readPropertyValue` path; no new SDK).

#### `KDB3/js/core/properties/applyDeveloperMode.js` (new)

- **Role:** controller / public method
- **Lines:** target 90 (hard 150)
- **AMD imports (1):** `"./applyHideWidgetsToggleChange.js"`
- **Entry:** `function applyDeveloperMode(_KDB, _options)`
- **Factory-scope helpers allowed:** `isPropertiesDisposed`, `warnDisposedOnce`, `echoKdbControlCheckbox`, `applyExplicit`
- **Body:**
  1. try/catch; `console.error("[properties.applyDeveloperMode]", err)` — do not throw to callers
  2. if properties controller disposed (`_KDB.runtime.properties.controller._isDisposed === true`): existing warn style (`console.warn("[properties.applyDeveloperMode] called after destroy")`, once via a module-level flag) + **no-op**
  3. `source = _options && _options.source`. Allowed: `"boot" | "cognos" | "kdbControl" | "writebackRestore"`. Else `console.error` + no-op
  4. if `source === "boot" || source === "cognos"`: call `_applyHideWidgetsToggleChange(_KDB)` (**re-read Cognos**, no spec write). Then if `source === "cognos"`: `echoKdbControlCheckbox(_KDB, !!(_KDB.properties && _KDB.properties.KDBHideWidgetsToggle === true))`
  5. if `source === "kdbControl" || source === "writebackRestore"`: `enabled` required; if missing, treat `false` and `console.error`. **Do not** call `_readPropertyValue`. Set `_KDB.properties = _KDB.properties || {}`; `_KDB.properties.KDBHideWidgetsToggle = enabled === true`. Call `_applyHideWidgetsToggleChange.applyClass(_KDB, enabled === true)`. **No** kdbControl echo. **No** Cognos write
  6. echo helper: if `_KDB.api.kdbControl.dispatch` is a function, dispatch `{ type: "kdbControl/settings/setDeveloperMode", payload: { value: !!value, skipHistory: true } }`. Do **not** AMD-import kdbControl. String type must match W3 `eventNames`
- **Return:** `applyDeveloperMode`
- **Rules to apply:** `kdb-object.mdc`; `module-public-api.mdc`; `state.mdc` (properties owns mirror + class); `error-handling.mdc`; `amd.mdc`; `cognos-adapter.mdc` (no spec write).

#### `KDB3/js/core/properties/__orchestratorProperties.js`

- **Role:** orchestrator
- **Lines:** hard **120** (today ~101). Adding API register must stay ≤ 120
- **AMD:** **replace** `"./applyHideWidgetsToggleChange.js"` with `"./applyDeveloperMode.js"` (stay at **6** imports)
- **`loadProperties`:** replace `_applyHideWidgetsToggleChange(this._KDB)` with `_applyDeveloperMode(this._KDB, { source: "boot" })`
- **Register (after `createController`, before or after load — must exist before kdbControl mount):**
  ```js
  _KDB.api = _KDB.api || {};
  _KDB.api.properties = {
    applyDeveloperMode: function (_options) {
      return _applyDeveloperMode(_KDB, _options);
    }
  };
  ```
- Destroy stays `runtime.properties.controller`. Do **not** put destroy on `_KDB.api.properties`
- **Rules to apply:** `kdb-object.mdc`; `feature-structure.mdc` (thin orchestrator); `module-public-api.mdc`.

#### `KDB3/js/core/properties/subscribeHideWidgetsToggleProperty.js`

- **Role:** controller
- **AMD:** replace `"./applyHideWidgetsToggleChange.js"` with `"./applyDeveloperMode.js"`
- **`runHandler`:** `_applyDeveloperMode(_KDB, { source: "cognos" })`
- Keep existing content.on / cleanup / try/catch
- **Rules to apply:** `error-handling.mdc`; `events.mdc` (host `change:property:KDBHideWidgetsToggle` already exists; no new KDB event); `cognos-adapter.mdc`.

---

### W2 — writeback

#### `KDB3/js/core/services/writeback/schema/v3Defaults.js`

- **Role:** pure config
- **In `SETT_KEY_CATALOG.dash`:**
  - **Keep** `hidSu` with `type: "flag01"` so old JSON still validates. Update `ownerStatePath` comment in the neighboring comment block: **retired / ignored by restore**. Do **not** delete the key. Do **not** change `type`.
  - **Add** `devOn: Object.freeze({ ownerStatePath: "settings.dashboard.isDeveloperMode", type: "flag01", defaultSource: "false", omitWhenValue: 0 })`
- Do not add `devOn` to v2 maps (none exist for `hidSu`)
- **Rules to apply:** `naming.mdc`; `feature-structure.mdc`.

#### `KDB3/js/core/services/writeback/get/collectors/collectCanvasSettings.js`

- **Role:** writer / collector
- **`collectDash`:** delete `hideSuButtons` / `hidSu` emit. Emit `dash.devOn = 1` **only when** `dashboard.isDeveloperMode === true`. Never emit `0`. Never emit `hidSu`
- File is **148** lines — swap in place; do not add a long comment block (hard 150)
- Update the file-header comment `bg/hidWs/hidSu` → `bg/hidWs/devOn`
- **Rules to apply:** `state.mdc` (read kdbControl via existing `getState` path only); `amd.mdc`.

---

### W3 — state / history / restore / seed

Action strings (put in `eventNames.js`):

| Constant | Value |
|---|---|
| `ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE` | `"kdbControl/settings/toggleDeveloperMode"` |
| `ACTION_SETTINGS_SET_DEVELOPER_MODE` | `"kdbControl/settings/setDeveloperMode"` |

Sister chrome (`toggleDashboardChrome` / `setDashboardChrome` / `hideWidgetSettingsButtons` / `hidWs`) **unchanged**. Remove `hideSuButtons` from chrome reducers (unknown chrome keys already `return state`).

#### `eventNames.js`

Add the two constants. No new events. **Rules:** `naming.mdc`; `events.mdc`.

#### `initialState.js` / `copyState.js` `defaultSettingsShape`

Replace `hideSuButtons: false` with `isDeveloperMode: false`. Do not leave both keys.

#### `selectors.js`

`readDashboardSettings`: replace `hideSuButtons` with `isDeveloperMode: !!d.isDeveloperMode` (default object too).

#### `reduceSettingsActions.js`

- **Role:** reducer (pure)
- Keep chrome toggle/set **only** for `hideWidgetSettingsButtons`
- Add:
  - `toggleDeveloperMode`: flip `next.settings.dashboard.isDeveloperMode`
  - `setDeveloperMode`: `value = !!(p && p.value)`; if equal current boolean, `return state`; else set
- Wire in `reduceSettingsActions` if-table
- **Rules:** `state.mdc`; `naming.mdc`; `error-handling.mdc` (reducer exempt)

#### `createKdbControlReducer.js`

Route the two new `eventNames` constants into `_reduceSettingsActions`. Do not grow controller-fn over 60 (this file is a reducer factory, not the module controller).

#### `applySettingsAction.js`

- `readCommitOptions`: if `action.payload && action.payload.skipHistory === true`, merge `{ skipHistory: true }` into commitOptions (Cognos echo uses payload flag, not `commitOptions`)
- After reduce, if action type is toggle/set developer mode **or** `commitOptions.isHistoryReplay`, call `_tryFrameworkSyncView(_KDB)` so the checkbox follows skipHistory echo
- **Rules:** `state.mdc`; `runtime.mdc`

#### `mountKdbControlController.js`

- **AMD imports stay 8.** No new import
- After `_KDB.state.kdbControl = _instance.reduce(_initialState(), { type: ACTION_INIT })` and **before** `_fw(...)`. Do **not** call `_KDB.api.properties.applyDeveloperMode` from this file (W4 post-dispatch does). `tryFrameworkSyncView` no-ops until `frameworkBindContext` exists:
  ```js
  var seeded = _KDB.properties && _KDB.properties.KDBHideWidgetsToggle === true;
  _instance.dispatch({
    type: _eventNames.ACTION_SETTINGS_SET_DEVELOPER_MODE,
    payload: { value: seeded, skipHistory: true }
  });
  ```
- Do not read Cognos. Do not `classList`. Reducer must already exist (same WP). Side effect (W4) applies class; if W4 not landed yet, seed still sets state
- **Rules:** `state.mdc`; `runtime.mdc`; `error-handling.mdc` (keep existing mount try/catch)

#### `buildParameterSetRestoreActions.js`

- **Remove** catalog row `sett.dash.hidSu` entirely (ignore legacy key; omitted-as-far-as-restore)
- **Add** `{ key: "sett.dash.devOn", kind: "boolValue", statePath: ["dashboard", "isDeveloperMode"], v3Path: ["settings", "dash", "devOn"], type: _eventNames.ACTION_SETTINGS_SET_DEVELOPER_MODE, field: null }`
- `resolveDesired` for `bool` **and** `boolValue`: `v3Value === 1 || v3Value === true` (omitted → `false`, i.e. not those) — same as today so omitted `devOn` restores **off**
- `isEqual` for `boolValue`: same as `bool`
- `buildAction`: if `kind === "boolValue"` (or type is setDeveloperMode), `payload = { value: desired === true, source: "writebackRestore" }` — **not** `hidden`. W4 reads `payload.source`. Do not edit `handleParameterSetRestore.js`.
- `newDashboard` overlay `{}` already yields omitted → false → apply off via W4 side effect
- **Rules:** `state.mdc`; `naming.mdc`

#### History four files

- `isHistoryTrackedSettingsTarget.js`: **remove** `dashboard.areSuButtonsHidden`; **add** `"dashboard.isDeveloperMode": 1`. No alias
- `readSettingsTargetSnapshot.js`: remove `areSuButtonsHidden` case; add `case "dashboard.isDeveloperMode": return { value: dash.isDeveloperMode === true };`
- `resolveHistoryTargetFromAction.js`: remove `hideSuButtons` chrome branch; if type is toggle **or** set developer mode, return `"dashboard.isDeveloperMode"`
- `applyControlSettingsHistoryReplay.js`: remove `areSuButtonsHidden` from the chrome replay `if`. Add: if `_target === "dashboard.isDeveloperMode"` and scalar is boolean, return `{ type: ACTION_SETTINGS_SET_DEVELOPER_MODE, payload: { value: scalar === true } }` (replay already sets `commitOptions.skipHistory/isHistoryReplay/forceApply`)
- Session stacks with old `areSuButtonsHidden` steps: ignore (`_isTracked` false → replay returns false). Contracted: no alias
- **Rules:** `state.mdc`; `naming.mdc`

---

### W4 — UI / effects

Hardcoded DE strings (do **not** add `labels.de`): switch label, `aria-label`, chrome caption, `title` via `createToggleSwitch` = `"Entwicklermodus"`.

#### `fillDashboardSettings.js`

Replace the SU block:

```js
var suToggle = P.createToggleSwitch(
  "Entwicklermodus",
  "dashboard.developerMode.toggle",
  false,
  "Entwicklermodus"
);
var suTogglePair = _createFrameworkElement("div", null, "kdb-control_dashboard-toggle-pair", null);
suTogglePair.appendChild(suToggle);
var suCol = _appendSettingsChromeBlock("Entwicklermodus", suTogglePair);
suCol.classList.add(
  "kdb-control_dashboard-toggles-column",
  "kdb-control_dashboard-toggles-column--developer-mode-gated"
);
_appendTwoInputSplit(r2, P.createColorInput("Hintergrundfarbe", "dashboardBg", _KDB), suCol);
```

Build **synchronously**, already gated (CSS `display: none`). Do not omit-then-insert. Do not use `KDB_hidden`. Do not touch Hintergrundfarbe. **Rules:** `dom.mdc`; `amd.mdc`; `error-handling.mdc`.

#### `bindFrameworkKdbActionToggles.js`

Replace `dashboard.suButtons.toggle` / `hideSuButtons` / `TOGGLE_DASHBOARD_CHROME` with:

```js
if (action === "dashboard.developerMode.toggle") {
  ctx.dispatch({ type: _eventNames.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE, payload: {} });
  primitiveSyncAfter();
  return;
}
```

Leave `dashboard.settingsButtons.toggle` untouched.

#### `syncFrameworkSwitchCheckboxes.js`

Replace `dashboard.suButtons.toggle` / `hideSuButtons` with `dashboard.developerMode.toggle` / `!!dashSu.isDeveloperMode`. **Checked = ON.** Do not invert.

#### `settingsPostDispatchSideEffects.js`

- Delete the `key === "hideSuButtons"` canvas-intent branch entirely
- Keep `hideWidgetSettingsButtons` canvas intent as today
- After existing canvas-intent switch (or in `runAfterDispatch`), if action type is `toggleDeveloperMode` **or** `setDeveloperMode`:
  1. `var fn = _KDB.api && _KDB.api.properties && _KDB.api.properties.applyDeveloperMode`
  2. if `typeof fn !== "function"`: `console.error("[kdbControl] _KDB.api.properties.applyDeveloperMode is not available")` — **not** the canvas warn; do not `classList`
  3. else `source = (action.payload && action.payload.source) || "kdbControl"` (restore catalog sets `"writebackRestore"`; UI/seed/history omit it). `fn({ enabled: !!d.isDeveloperMode, source: source })`
- `skipHistory` dispatches **still** call apply
- Do **not** invent `_KDB.api.canvas` for this flag
- **Rules:** `state.mdc`; `module-public-api.mdc`; `error-handling.mdc`; `cognos-adapter.mdc`

#### `applyDeveloperModeToggleVisibility.js` (new)

- **Role:** effect
- **Lines:** target 80 (hard 150)
- **AMD imports:**
  - `"../../../../core/utils/isRightAllowed.js"`
  - `"../../../../core/utils/readFirstRowScalar.js"`
  - (file lives in `kdbControl/effects/` → four `../` to `js/`, not five)
- **Entry:** `function applyDeveloperModeToggleVisibility(_KDB)`
- **Body:**
  1. try/catch; `console.error("[kdbControl.applyDeveloperModeToggleVisibility]", err)`; on catch stay hidden
  2. `rt = _KDB.runtime.kdbControl`; if missing return
  3. abort previous `rt.abortControllers.developerModeToggleVisibility` if any; `ac = new AbortController()`; store on that key
  4. `tableData = _KDB.services.tableData`; if `waitForRows` missing → stay hidden
  5. `input = [{ tableName: "superuser", isCoreTable: true }]`
  6. `return tableData.waitForRows(input).then(onRows, onFail)` — **no async IIFE**; factory-scope `onRows` / `onFail` / `unhideIfAllowed`
  7. `onFail` / abort / disposed / non-array: stay hidden. **No toast**
  8. After wait: prefer `tableData.readRows(input)` if array, else waited value
  9. if `ac.signal.aborted` return
  10. if `!_isRightAllowed(_readFirstRowScalar(rows))` stay hidden
  11. `col = (rt.domRefs && rt.domRefs.rootEl || document).querySelector(".kdb-control_dashboard-toggles-column--developer-mode-gated")`; if found, `col.classList.add("kdb-control_dashboard-toggles-column--developer-mode-visible")`
- Do not `ensureFreshRows` / `reloadTable` / `abortTable`
- Destroy: existing `cleanupKdbControlRuntime` already `abort()`s every `abortControllers` key — **do not edit cleanup**
- **Rules:** `runtime.mdc`; `error-handling.mdc`; `amd.mdc`; `dom.mdc`; `events.mdc` (no loadFinished)

#### `__orchestratorEffects.js`

Add AMD import of `./applyDeveloperModeToggleVisibility` (2nd import). After `applyControlPanelShellVisuals`, call `_applyDeveloperModeToggleVisibility(_KDB)`. Keep thin. **Rules:** `feature-structure.mdc`; `error-handling.mdc`.

#### `KDB3/css/kdb-control/panels.css`

Replace selector `.kdb-control_dashboard-toggles-column--su-with-caption` with `--developer-mode-gated` (keep grouping with `--diagram-chrome` if the alignment rule is still valid).

Add:

```css
.kdb-control_dashboard-toggles-column--developer-mode-gated:not(.kdb-control_dashboard-toggles-column--developer-mode-visible) {
  display: none;
}
.kdb-control_twoinput-row-split:has(> .kdb-control_dashboard-toggles-column--developer-mode-gated:not(.kdb-control_dashboard-toggles-column--developer-mode-visible)) {
  grid-template-columns: minmax(0, 1fr);
}
```

`:has()` is already used in this file. Do not restyle Diagramme row. Do not use `.KDB_hidden`.

---

### W5 — Slice B metricsTree

#### `readSuperUserAllowed.js` (new)

- **Role:** effect helper
- **Lines:** target 60 (hard 120)
- **AMD:** `"../../../core/utils/isRightAllowed.js"`, `"../../../core/utils/readFirstRowScalar.js"`
- **Entry:** `function readSuperUserAllowed(_KDB)` → Promise\<boolean\>
- Fail-closed `false` on: missing tableData, wait reject, abort, non-array, empty, not allowed, any throw (catch + `console.error("[metricsTree.readSuperUserAllowed]", err)` + resolve `false` — **do not reject**, tree must still build)
- Same `waitForRows` input as W4: `[{ tableName: "superuser", isCoreTable: true }]` then `readRows` if array
- **Rules:** `error-handling.mdc`; `amd.mdc`; `runtime.mdc` (do not abort Kennzahlen table)

#### `runMetricsTreeMount.js`

- Today ~140 lines / **6** imports. Add **one** import `./readSuperUserAllowed.js` (7 ≤ 10)
- In `runMountPipeline`, after `sourceInput = await readSourceInput(...)` and abort check, **before** `_buildMetricsTreeSources`:
  ```js
  sourceInput.isSuperUserAllowed = await _readSuperUserAllowed(_KDB);
  ```
  If this would exceed 150 lines, move the two-line assign into `readSourceInput` instead — **do not** split a third file without stopping
- SuperUser miss must **not** fail the Kennzahlen wait; do not wrap Kennzahlen `waitForRows` in the SuperUser catch
- **Rules:** `feature-structure.mdc`; `error-handling.mdc`

#### `buildMetricsTreeSources.js`

Pass `!!sourceInput.isSuperUserAllowed` into `_buildMetricsTreeNodes` as the 5th argument (replace `_KDB`). Keep `_KDB` in `buildSourceEntry` for property reads.

#### `buildMetricsTreeNodes.js`

- Change signature 5th param from `_KDB` to `_isSuperUserAllowed`
- `rowPassesFreigabe(row, columns.release, _isSuperUserAllowed)`
- **Delete** `_KDB.superUser` read. Use `const superUser = _isSuperUserAllowed === true ? 1 : 0` (or `if (!_isSuperUserAllowed && freigabe === 0) return false` while keeping missing-column / NaN / empty-raw as **pass** — preserve today's `rowPassesFreigabe` control flow except the SuperUser source)
- Do not change `isBetaRelease` / leaf `(Beta)` text (lives in `buildMetricsTreeLeafNode.js`)
- **Rules:** `state.mdc`; `kdb-object.mdc` (no `_KDB.superUser`); `amd.mdc`

---

## Section D. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle |
|---|---|---|---|
| `kdbControl/init` | mount | copy initial; `lifecycle: "mounted"` | idle → mounted |
| `kdbControl/settings/toggleDeveloperMode` | checkbox | flip `settings.dashboard.isDeveloperMode` | none |
| `kdbControl/settings/setDeveloperMode` | seed, restore, Cognos echo, history replay | set `isDeveloperMode` to `!!payload.value`; no-op if equal | none |
| `kdbControl/settings/toggleDashboardChrome` | Diagramme sister only | flip `hideWidgetSettingsButtons` only | none |
| `kdbControl/destroy` | destroy | `disposed` | → disposed |

`payload.skipHistory` is **not** a reducer field (history layer / commitOptions).

---

## Section E. Published selectors

| Selector | Reads | Returns |
|---|---|---|
| `readDashboardSettings` | `state.settings.dashboard` | includes `isDeveloperMode: boolean`; **no** `hideSuButtons` |

---

## Section F. Public API wiring

- `_KDB.api.properties = { applyDeveloperMode }` where `applyDeveloperMode(_options)` closes over `_KDB`
- `_KDB.api.kdbControl` unchanged shape `{ mount, destroy, dispatch, getState, syncView }`
- `_KDB.runtime.kdbControl.abortControllers.developerModeToggleVisibility`
- `_KDB.runtime.properties.controller` destroy unchanged
- No `_KDB.utils.isRightAllowed` registration

---

## Section G–I. Harness / mocks

**N/A.** No new harness. Do not add TEST HTML.

---

## Section J. Acceptance criteria (self-verify before report)

1. Non-SU: Entwicklermodus column `display:none` and row collapses to one column; gear + Diagramme Settings-Buttons remain. Table miss/error: same (fail-closed).
2. SU=`1` / `"1"` / `true`: `--developer-mode-visible` after `waitForRows`; no flash (gated at first paint).
3. Toggle on → `#main.KDB_developerMode` (via properties) → Cognos buttons + leftover widgets. Toggle off → class removed. kdbControl never `classList` on `#main`.
4. Widget-property flip still live; checkbox follows via `setDeveloperMode` + `skipHistory`. kdbControl toggle does **not** write Cognos spec.
5. Reload without SET: boot re-read / spec wins. After SET restore: `devOn` wins; omitted `devOn` → `isDeveloperMode false` → class **off** even if spec was on.
6. GET emits `sett.dash.devOn: 1` only when on; never `hidSu`. SET with legacy `hidSu: 1` still **validates**; restore **ignores** it (no invert).
7. History undo/redo of the kdbControl toggle moves the class (`dashboard.isDeveloperMode` / `setDeveloperMode`).
8. Slice B: SU=`1` sees Freigabe=`0` leaves with `(Beta)`; non-SU does not. Freigabe=`1` unchanged. Zero `_KDB.superUser` reads/writes.
9. No file > 150 JS / 120 orchestrator. `__orchestratorUtils.js` still 10 imports. `__orchestratorProperties.js` ≤ 120. `runMetricsTreeMount.js` ≤ 150 and ≤ 10 imports.
10. No nested functions inside entry bodies. No new events. No `hidWs` behavior change.
11. Report: Section L checklist + 14 echoed summaries.

---

## Section K. Forbidden actions

- Re-open product decisions in the delta / handoff tables
- Write `_KDB.superUser`, `_KDB.properties` from kdbControl, `classList` on `#main` from kdbControl
- Call `_KDB.api.canvas.dispatch` for developer mode; keep canvas warn **only** for remaining real canvas intents
- Cognos `setPropertyValue` / rename persist-id `KDBHideWidgetsToggle`
- Reuse `hidSu` as the live key; invert old `1`; drop `hidSu` from `SETT_KEY_CATALOG`
- Gate the settings gear; touch `hideWidgetSettingsButtons` / Diagramme toggle except leaving it working as today
- `ensureFreshRows` / `reloadTable` / `abortTable("superuser")` / specialSingleSelect `TABLE_KEYS` / import specialSingleSelect
- Subscribe `tableData:loadFinished`
- Edit `.mdc` rules, `KDB.js`, `_archive` as live, git commit/push
- Add utils to `__orchestratorUtils.js`
- Invent `helpers/` `common/` `shared/`
- Skip Section A echo
- Silent divergence: stop and report to captain/PO; update delta first

---

## Section L. Reporting template (each writer)

1. Pre-flight echo (14 sentences)
2. File checklist: path, line count, matches spec | deviation
3. Deviations with motivation (must be empty unless captain already approved)
4. Self-verification of Section J items this slice owns (pass/fail)
5. Open questions — **do not improvise**; stop if blocked

---

## Section M. Reviewer handoff

Captain launches **fresh** grok 4.6 reviewers (not the writers):

1. Mechanical: AMD, `_` prefix, try/catch, file size, import count, no foreign state writes, no `#main` from kdbControl, no `_KDB.superUser`, exclusive allowlists honored
2. Semantic: polarity `true` = ON; SuperUser fail-closed no-flash; `applyDeveloperMode` explicit vs Cognos re-read; `hidSu` ignored; Slice B explicit boolean

Then PO Cognos checklist (handoff):

1. Non-SU: no Entwicklermodus chrome; gear + Diagramme Settings-Buttons remain
2. SU=`1`: chrome without flash; toggle on → IBM buttons + leftover widgets; off → hidden
3. Widget-property Developers modus still live-flips class; kdbControl checkbox follows
4. Reload without SET: spec wins. After save/restore: `devOn` wins; omitted `devOn` turns class off
5. SU=`1` sees `(Beta)` Kennzahlen; non-SU does not. Freigabe=1 unchanged
6. Dashboard spec is **not** dirtied by the kdbControl toggle
