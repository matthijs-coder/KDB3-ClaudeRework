# Contract Delta: kdbControl developer-mode toggle + SuperUser visibility

> Product ack PO vastenburg 2026-09-02: SuperUser=`1` gates **visibility** of the kdbControl control + its text only. Toggle `true` = Developers modus ON = class `KDB_developerMode` on `#main` (same as widget property `KDBHideWidgetsToggle`). Hide-polarity names die. Defaults: persist both (SET writeback wins); new v3 key `devOn`; SuperUser match `1` / `"1"` / `true`; leftover-unhide accepted; DE label `Entwicklermodus`; action `dashboard.developerMode.toggle`; kdbControl does **not** write the Cognos property.
>
> Slice B (same WP): SuperUser=`1` also restores Kennzahlen Freigabe=0 / `(Beta)` visibility. Today nobody sees those rows because `_KDB.superUser` has no writer.

---

**Status:** `Approved` — PO vastenburg 2026-09-02 (chat). No production JS in that turn; next captain runs execution spec + army.
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6 (coordinator), 2026-09-02
**Reviewed by:** PO vastenburg, approved 2026-09-02 (includes Slice B metricsTree Freigabe/`(Beta)`)
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`, `cognos-adapter.mdc`

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/kdbControl.md` | S1 href, S2 / §7 canvas intents, settings key, properties call |
| `contracts/_archive/kdbControl-settings-cp1-contractdelta.md` | **Do not edit.** Supersede only the SU/developer slice; remaining settings stay archive authority. Fix live href to `_archive/`. |
| `contracts/kdb-ready-halt-developer-mode-contractdelta.md` | Re-open Superuser JS / `hideSuButtons` for this gate+toggle. Class owner stays properties. |
| `contracts/leftover-widgets-developer-hide-contractdelta.md` | CSS gate unchanged. JS may call properties apply. |
| `contracts/writeback.md` §4.1.1 | `hidSu` retired; `devOn` live |
| `contracts/kdbControl-parameterSetRestore-contractdelta.md` | restore `devOn` via developer-mode path |
| `contracts/properties.md` | Q2 narrow reopen; Q11 already closed by Ready-halt; kdbControl is a caller |
| `contracts/tableDataService.md` §10 | Service still does not interpret SuperUser; consumers `waitForRows` |
| `contracts/kennzahlenTree.md` / production `metricsTree` | Slice B Freigabe filter |
| `contracts/anew.md` | Dashboard sketch |
| `contracts/dashboardPdf-capture-chrome-hide-contractdelta.md` / `dashboardPdf-drillthrough-icon-hide-contractdelta.md` | Rename the kdbControl chrome phrase; no PDF behavior change |

---

## 1. Purpose

Two jobs, one SuperUser table:

1. **Visibility (kdbControl UI).** Users with SuperUser first-row scalar `1` / `"1"` / `true` see the Dashboard-settings toggle and its caption. Everyone else does not. The settings gear and Diagramme “Settings-Buttons verstecken” stay visible to all.
2. **Effect.** Checking the toggle turns Developers modus **on**: `_KDB.properties.KDBHideWidgetsToggle` mirror + class `KDB_developerMode` on catalog `#main`. Same CSS as the widget property (Cognos buttons **and** leftover widgets). Unchecking turns it off. **2026-09-02:** which IBM nodes that class reveals is [cognosButtons-allowlist-invert-contractdelta.md](./cognosButtons-allowlist-invert-contractdelta.md) (allow-list four stay un-overlaid).

Slice B: the same SuperUser scalar lets `metricsTree` show Freigabe=`0` rows (leaf text suffix `(Beta)`). Non-superusers still see only Freigabe truthy / missing-column rows.

---

## 2. Ownership (Option C)

| Concern | Canonical owner | Others |
|---|---|---|
| Class `KDB_developerMode` on `dashboardClassHost` | **properties** | kdbControl **calls** `_KDB.api.properties.applyDeveloperMode`; never `classList` on `#main` |
| `_KDB.properties.KDBHideWidgetsToggle` | **properties** | kdbControl **reads** at mount seed; does not write `_KDB.properties` |
| Cognos spec `KDBHideWidgetsToggle` | **properties** (Cognos re-read path only) | kdbControl does **not** `setPropertyValue` |
| `_KDB.state.kdbControl.settings.dashboard.isDeveloperMode` | **kdbControl** reducer | properties may `dispatch` `setDeveloperMode` with `skipHistory: true` to sync the checkbox |
| Writeback `sett.dash.devOn` | kdbControl collect + restore | GET omit when `0` |
| SuperUser membership | **no shared state** | each consumer reads `tableData.waitForRows` + shared **pure** scalar helper |
| `_KDB.state.tableData.superuser` | **tableDataService** | foreign reads only via service API |

**Forbidden:** `_KDB.superUser` (not an allowed top-level). Router service. `_KDB.api.canvas.dispatch` for this flag. `KDB_superuser` class. Gating the settings gear.

**Q2 reopen (properties), narrow:** publish `_KDB.api.properties = { applyDeveloperMode }` from the properties orchestrator. Not a feature dispatch surface. Not `_KDB.services.properties`. Destroy stays on `runtime.properties.controller` as today.

---

## 3. SuperUser scalar (shared, fail-closed)

Pure helper (both consumers AMD-import; no service calls inside):

```txt
KDB3/js/core/utils/readFirstRowScalar.js
KDB3/js/core/utils/isRightAllowed.js
```

- First row, first column; then `cell.use` → `cell.u` → `cell.d` → primitive (same as `readSpecialRightsFromTableData`, **do not** AMD-import specialSingleSelect).
- Allowed iff `1` / `"1"` / `true`.
- Missing table, empty rows, empty cell, `0` / `"0"`, NaN, load error, abort, disposed → **not** allowed.

Table input: `[{ tableName: "superuser", isCoreTable: true }]`. Config key `superuser`, vis-title `SuperUser`. `waitForRows` only — **not** `ensureFreshRows` / `reloadTable` / `abortTable("superuser")`.

Do **not** add `superuser` to specialSingleSelect `TABLE_KEYS`.

---

## 4. Slice A — kdbControl toggle

### 4.1 UI

`fillDashboardSettings.js` still builds the chrome **synchronously**, already **hidden**:

| Today | After |
|---|---|
| label `"SU"` | `"Entwicklermodus"` |
| `data-kdb-action="dashboard.suButtons.toggle"` | `dashboard.developerMode.toggle` |
| aria `"SU-Buttons verstecken"` | `"Entwicklermodus"` |
| caption `"Buttons verstecken"` | `"Entwicklermodus"` |
| class `--su-with-caption` | `--developer-mode-gated` default; `--developer-mode-visible` after confirm |

Hide root = the Dashboard chrome column (`suCol` today). CSS `display: none` while gated. Collapse the two-column row so non-SU do not get an empty half. Do not omit-then-insert. Do not reuse `KDB_hidden`.

After mount, effects: `waitForRows` SuperUser → if allowed and not aborted, add `--developer-mode-visible`. AbortController: `_KDB.runtime.kdbControl.abortControllers.developerModeToggleVisibility`. Catch → stay hidden. No toast (tableData already toasts load failure).

### 4.2 State

Replace `settings.dashboard.hideSuButtons` with:

```js
isDeveloperMode: false  // true = developer mode ON
```

Default `false`. `readDashboardSettings` exposes `isDeveloperMode`.

**Mount seed:** on `kdbControl/init` (after properties `setupCore` has run), copy `_KDB.properties.KDBHideWidgetsToggle === true` into `isDeveloperMode` so the checkbox matches spec until writeback SET.

### 4.3 Actions

Sister chrome (`hideWidgetSettingsButtons`) stays on `toggleDashboardChrome` / `setDashboardChrome` with payload `hidden`.

New actions (do **not** reuse `hidden` for this flag):

| type | payload | effect |
|---|---|---|
| `kdbControl/settings/toggleDeveloperMode` | `{}` | flip `isDeveloperMode` |
| `kdbControl/settings/setDeveloperMode` | `{ value: boolean, skipHistory?: boolean }` | set `isDeveloperMode` to `!!value` |

Bind `dashboard.developerMode.toggle` → `toggleDeveloperMode`. Sync checkbox from `isDeveloperMode`.

History target: `dashboard.isDeveloperMode`, snapshot `{ value: boolean }`. Replay → `setDeveloperMode`. No alias for `areSuButtonsHidden` (session stack only).

### 4.4 Effect after reducer commit

Replace `kdbControl.canvasIntent.dashboardHideSuButtons` with:

```js
_KDB.api.properties.applyDeveloperMode({
  enabled: !!state.settings.dashboard.isDeveloperMode,
  source: "kdbControl"
})
```

If `applyDeveloperMode` is missing: one `console.error` (not the canvas warn). Do not add/remove the class locally.

`skipHistory: true` dispatches still call apply (checkbox echo from Cognos must move the class if the boolean changed — normally it already matches).

### 4.5 Restore / GET

| v3 key | Live? | Restore | GET |
|---|---|---|---|
| `sett.dash.devOn` | **yes** | `setDeveloperMode` `{ value: (v3===1) }` then apply `source: "writebackRestore"` | emit `1` only when `isDeveloperMode === true` |
| `sett.dash.hidSu` | **retired** | **ignore** (do not apply; treat as omitted) | **never emit** |

Keep `hidSu` in `SETT_KEY_CATALOG` so existing v3 JSON still validates (`0|1`). Old `1` is **not** inverted and **not** migrated to `devOn`.

Absolute restore: omitted `devOn` → `isDeveloperMode: false` → `applyDeveloperMode({ enabled: false, source: "writebackRestore" })`. **Writeback wins after SET**, including over a spec-on class from boot.

`newDashboard`: owner defaults (`false`) + apply off.

v2 map: unchanged (no `hidSu` / `devOn`).

---

## 5. properties `applyDeveloperMode`

```js
_KDB.api.properties.applyDeveloperMode({
  enabled: boolean,                     // required when source is kdbControl | writebackRestore
  source: "boot" | "cognos" | "kdbControl" | "writebackRestore"
})
```

| source | Value | Cognos spec | Class | Echo checkbox |
|---|---|---|---|---|
| `boot` | re-read Cognos (`applyHideWidgetsToggleChange` path) | no write | yes | no (kdbControl not mounted) |
| `cognos` | re-read Cognos | no write (host already changed) | yes | `setDeveloperMode` `{ value, skipHistory: true }` if `_KDB.api.kdbControl` exists |
| `kdbControl` / `writebackRestore` | **payload `enabled`** — do **not** re-read Cognos | **no write** | yes | n/a (caller owns state) |

Boot `loadProperties` keeps calling the Cognos re-read path (`source: "boot"`). Host subscribe `change:property:KDBHideWidgetsToggle` uses `source: "cognos"`.

**Echo / loop:** kdbControl never writes Cognos → no `change:property` from the in-app toggle → no loop. Cognos panel → subscribe → class + skipHistory checkbox only.

Disposed properties: `applyDeveloperMode` no-op + existing warn style. kdbControl after destroy: existing disposed-state table.

Persist-id `KDBHideWidgetsToggle` **unchanged**. spec.json label unchanged.

---

## 6. Slice B — metricsTree `(Beta)` / Freigabe

**Fact:** `isBetaRelease` is `parseInt(Freigabe)===0`. `rowPassesFreigabe` keeps those rows only when `superUser` is truthy. Production reads `_KDB.superUser.true` which is **never written** → every session `superUser=0` → **nobody** sees `(Beta)` leaves. Freigabe=`1` rows stay visible to all.

**This WP:** `runMetricsTreeMount` / source build `waitForRows` SuperUser (same input as Slice A) **before** `buildMetricsTreeNodes`. Pass an explicit `isSuperUserAllowed` boolean into the node builder (do not read `_KDB.superUser`). Fail-closed: wait reject / abort → `false` → tree still builds, Freigabe=0 rows stay out. Do not block Kennzahlen tables on SuperUser error.

Remove the `_KDB.superUser` read from `buildMetricsTreeNodes.js`. Do not write that namespace.

`kennzahlenTree.md` L54 (“filtering unreleased rows for non-superusers”) stays the product rule; this delta supplies the missing SuperUser source.

---

## 7. Events

None. No `properties:hideWidgetsToggled`. No `tableData:loadFinished` subscribe for these gates (`waitForRows` cache-hits already-ready). Do not add `eventSubscribe.md` rows.

---

## 8. Cognos touchpoints

- Class host: existing `dashboardClassHost` / `#main`. kdbControl does not query `#main`.
- Properties boot + host subscribe: existing `content.getPropertyValue` / `change:property:KDBHideWidgetsToggle`.
- **No** new cognosHost facet. **No** spec write from this WP.

---

## 9. Out of scope

- Settings-gear SuperUser lock (legacy lastOriginal).
- `hideWidgetSettingsButtons` / `hidWs` / Diagramme toggle / gear `KDB_hide`. Visual effect is [kdbControl-widget-chrome-always-contractdelta.md](./kdbControl-widget-chrome-always-contractdelta.md). This developer-mode slice still does not edit that path.
- Overlay-port / `KDB_superuser` CSS / renaming `KDBHideWidgetsToggle`.
- Moving leftover CSS off `KDB_developerMode`.
- Writing Cognos `KDBHideWidgetsToggle` from kdbControl.
- Park / Ready halt / widgetBase routing.
- specialSingleSelect `TABLE_KEYS`.

---

## 10. Implementation files (normative list, not a second architecture)

**properties:** `applyHideWidgetsToggleChange.js` (split explicit vs re-read), `__orchestratorProperties.js` (register `_KDB.api.properties`), new `applyDeveloperMode.js` if split keeps files ≤150 lines.

**kdbControl:** `fillDashboardSettings.js`, `bindFrameworkKdbActionToggles.js`, `syncFrameworkSwitchCheckboxes.js`, `panels.css`, `initialState.js` / `copyState.js` / `selectors.js` / `reduceSettingsActions.js` / `eventNames.js`, `settingsPostDispatchSideEffects.js`, history four files, `buildParameterSetRestoreActions.js`, effects `applyDeveloperModeToggleVisibility.js` + orchestrator effects.

**writeback:** `v3Defaults.js` (`devOn` + retired `hidSu`), `collectCanvasSettings.js`.

**shared:** `core/utils/isRightAllowed.js`, `core/utils/readFirstRowScalar.js`.

**metricsTree:** `runMetricsTreeMount.js` (or source build), `buildMetricsTreeNodes.js`.

**contracts:** this file; parent one-liners listed in the header table.

---

## 11. Acceptance

1. Non-SU: Dashboard Entwicklermodus chrome absent; settings gear and Diagramme gear-toggle present. SuperUser table miss/error: same.
2. SU=`1`: chrome visible after `waitForRows`; no flash of the control for non-SU.
3. Toggle on → `#main.KDB_developerMode` → Cognos buttons + leftover widgets visible. Toggle off → class removed.
4. Widget-property flip still works live; kdbControl checkbox follows with `skipHistory`.
5. kdbControl toggle does **not** dirty the Cognos spec. Reload without SET: spec wins (boot re-read). After SET: `devOn` wins, omitted `devOn` turns class **off**.
6. GET emits `sett.dash.devOn: 1` only when on; never `hidSu`. SET with legacy `hidSu: 1` validates and ignores it.
7. History undo/redo of the kdbControl toggle moves the class.
8. Slice B: SU=`1` sees Freigabe=0 leaves with `(Beta)`; non-SU does not. Freigabe=1 unchanged for everyone. No `_KDB.superUser`.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | Draft → Approved | PO vastenburg | Product defaults + written delta including Slice B. Implementation deferred to a fresh captain + grok 4.6 army. |
