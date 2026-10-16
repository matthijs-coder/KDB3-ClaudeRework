# kdbControl — settings state (CP-1 contractdelta)

**Status:** CP-1 approved for sandbox port documentation.  
**Datum:** 2026-05-13  
**Relatie:** verfijnt `kdbControl.md` §5 (readers), §3 (`abortControllers`), §7 (dependencies), §9 (folder layout), §10 (out of scope); align met `state.mdc`, `module-public-api.mdc`, `dom.mdc`, `runtime.mdc`. **Implementatie:** [kdbControl-settings-cp1-execution-spec.md](./kdbControl-settings-cp1-execution-spec.md).

---

## 1. Purpose

Deze delta legt vast dat **dashboard-, diagram-, kommentaar- en Steuerungspanel-instellingen** in de sandbox **uitsluitend** onder `_KDB.state.kdbControl.settings` leven, met **reducer-gedreven** mutaties via `_KDB.api.kdbControl.dispatch`. Geen Cognos, geen persistence, geen writes naar widgets/header/footer/dashboard/canvas state, geen `_KDB.properties` writes, geen globale DOM buiten de geplaatste kdbControl-shell (uitgezonderd **optionele** aanroepen van een **placeholder** `_KDB.api.canvas.dispatch` — zie §2b).

**Scope (vier secties in settings-UI):**

| Sectie (UI) | State subtree |
|-------------|----------------|
| Dashboard | `settings.dashboard` |
| Diagramme / nieuwe visualisatie-defaults | `settings.defaultsNew.visualization` |
| Kommentare / nieuwe comment-defaults | `settings.defaultsNew.comment` |
| Steuerungspanel kleuren | `settings.controlPanel` |

**Buiten scope in deze tranche:** overige toolbox/settings-body’s (tabs, placeholders, actieknoppen zonder settings-mapping) blijven **inert** — geen nieuwe reducer-acties, geen nieuwe state-keys.

---

## 2. Ownership

| Onderdeel | Eigenaar |
|-----------|----------|
| `_KDB.state.kdbControl.settings` | **kdbControl** reducer (enige writer) |
| Settings-gerelateerde DOM binnen geplaatste shell | Framework builders + sync/bind; mutatie **alleen** via `dispatch` |
| Dashboard canvas layout / achtergrond / dashboard-chrome toggles (productie-dashboard) | **Toekomstige canvas owner** — kdbControl stuurt na reducer-commit uitsluitend **intents** via optionele `_KDB.api.canvas.dispatch` (zie §2b). **Geen** directe canvas-DOM of `_KDB.state.dashboard` / `canvas` writes vanuit kdbControl. |
| Steuerungspanel-kleuren (`settings.controlPanel.*`) | **kdbControl** past alleen **shell-DOM** toe (root / collapse-pijl / `.kdb-control_action-button` binnen de shell); geen canvas-eigenaar. |

**Verboden:** `framework.placeholderInputs` / `framework.placeholderSelections` mogen **geen** waarheid meer dragen voor de velden in §4 (DOM-mapping). Bestaande placeholder-mechanismen blijven voor **andere** inert controls (metrics/demo/toolbox niet in scope).

---

## 2b. Deferred canvas owner (`_KDB.api.canvas.dispatch`, optioneel)

- **Contract:** `_KDB.api.canvas` is een **optionele** host-hook. Alleen **`dispatch({ type, payload })`** is in deze tranche genormeerd als **placeholder**-oppervlak; er is **geen** echte canvas-module in de sandbox.
- **Wanneer:** Na een geslaagde reducer-commit voor **dashboard**-velden die de fysieke canvas-layout raken: **breedte**, **hoogte**, **achtergrondkleur**, **widget-settingsknoppen verbergen** (`hideWidgetSettingsButtons`), en **SU-knoppen verbergen** (`hideSuButtons`).
- **Gedrag als hook ontbreekt:** precies **één** `console.warn` per pagina-load (geen throw, geen fallback DOM/state write buiten `_KDB.state.kdbControl.settings`).
- **Verboden:** kdbControl mag **niet** schrijven naar `_KDB.state.widgets`, `header`, `footer`, `dashboard`, of `canvas` voor deze intents.

**Intent-`type`-strings** (stabiel; canvas owner map deze later):

| `type` | `payload` |
|--------|-----------|
| `kdbControl.canvasIntent.dashboardWidth` | `{ value: string }` — ruwe invoerstring (`settings.dashboard.width`). |
| `kdbControl.canvasIntent.dashboardHeight` | `{ value: string }` — idem hoogte. |
| `kdbControl.canvasIntent.dashboardBackgroundColor` | `{ value: string }` — idem achtergrondkleur. |
| `kdbControl.canvasIntent.dashboardHideSuButtons` | `{ value: boolean }` — `settings.dashboard.hideSuButtons` na toggle. |
| `kdbControl.canvasIntent.dashboardHideWidgetSettingsButtons` | `{ value: boolean }` — `settings.dashboard.hideWidgetSettingsButtons` na toggle. |

**Niet** via canvas-dispatch: default visualization/comment velden blijven state-only tenzij een latere delta een owner definieert.

---

## 3. State shape (normatief)

Startwaarden: **lege strings** voor alle stringvelden; **`false`** voor beide booleans.

```js
_KDB.state.kdbControl.settings = {
  dashboard: {
    width: "",
    height: "",
    backgroundColor: "",
    hideWidgetSettingsButtons: false,
    hideSuButtons: false,
  },
  controlPanel: {
    backgroundColor: "",
    buttonColor: "",
    actionButtonColor: "",
  },
  defaultsNew: {
    visualization: { width: "", height: "", backgroundColor: "" },
    comment: { width: "", height: "", backgroundColor: "" },
  },
};
```

- Geen `{ value, unit }`, geen `isConfirmed`, geen `snapshot` / `dashboardDimensions` / `controlPanelColors` keys onder `settings`.

---

## 4. Dispatch actions (`kdbControl` reducer)

Alle `type`-waarden zijn slash-actions; reducer blijft **puur** (geen side-effects).

| `type` | `payload` | Effect |
|--------|-----------|--------|
| `kdbControl/settings/setDashboardDimension` | `{ dimension: "width" \| "height", value: string }` | Zet `settings.dashboard.width` of `.height` op `String(value ?? "")`. |
| `kdbControl/settings/setDashboardColor` | `{ value: string }` | Zet `settings.dashboard.backgroundColor` op `String(value ?? "")`. |
| `kdbControl/settings/setControlPanelColor` | `{ role: "background" \| "button" \| "actionButton", value: string }` | Mapt op `backgroundColor`, `buttonColor`, `actionButtonColor` respectievelijk. |
| `kdbControl/settings/setVisualizationDefault` | `{ field: "width" \| "height" \| "backgroundColor", value: string }` | Zet het corresponderende veld onder `settings.defaultsNew.visualization`. |
| `kdbControl/settings/setCommentDefault` | `{ field: "width" \| "height" \| "backgroundColor", value: string }` | Zet het corresponderende veld onder `settings.defaultsNew.comment`. |
| `kdbControl/settings/toggleDashboardChrome` | `{ key: "hideWidgetSettingsButtons" \| "hideSuButtons" }` | **Toggle-only:** flip de boolean `settings.dashboard[key]`. Geen andere keys toegestaan. |

**Validatie (no-op = return vorige state):**

- Onbekend `action.type` voor settings: reducer laat state ongewijzigd (bestaand patroon).
- Settings-actions: bij ontbrekend/ongeldig `payload` (verkeerde `dimension`, `role`, `field`, `key`) → **no-op**.

---

## 5. Published selectors

Export vanuit `kdbControl/state/selectors.js`. Signatuur: eerste argument is **`kdbControl` state root** `s` (zoals bestaande framework-selectors).

| Selector | Returns |
|----------|---------|
| `readDashboardSettings(s)` | `s.settings.dashboard` (volledig object; altijd de vorm uit §3) |
| `readControlPanelSettings(s)` | `s.settings.controlPanel` |
| `readVisualizationDefaults(s)` | `s.settings.defaultsNew.visualization` |
| `readCommentDefaults(s)` | `s.settings.defaultsNew.comment` |

**Superseded / verwijderd (geen shims):** `readSettingsSnapshot`, `readDashboardDimensions`, `readControlPanelColors` en bijbehorende state-paden (`settings.snapshot`, `settings.dashboardDimensions`, `settings.controlPanelColors`) vervallen voor deze CP-1 slice. Sandbox-code die ze nog gebruikt, wordt **vervangen** (niet gealiast).

---

## 6. DOM → state mapping (normatief)

Stabiele ids/attributen uit `buildControlMainBlocks.js` / gallery:

| DOM / attribuut | State pad |
|-----------------|-----------|
| `data-placeholder-input-id="dashboardWidth"` | `settings.dashboard.width` |
| `data-placeholder-input-id="dashboardHeight"` | `settings.dashboard.height` |
| `data-placeholder-input-id="dashboardBg"` | `settings.dashboard.backgroundColor` |
| `data-placeholder-input-id="graphWidth"` | `settings.defaultsNew.visualization.width` |
| `data-placeholder-input-id="graphHeight"` | `settings.defaultsNew.visualization.height` |
| `data-placeholder-input-id="graphBg"` | `settings.defaultsNew.visualization.backgroundColor` |
| `data-placeholder-input-id="commentWidth"` | `settings.defaultsNew.comment.width` |
| `data-placeholder-input-id="commentHeight"` | `settings.defaultsNew.comment.height` |
| `data-placeholder-input-id="commentBg"` | `settings.defaultsNew.comment.backgroundColor` |
| `data-placeholder-input-id="panelBg"` | `settings.controlPanel.backgroundColor` |
| `data-placeholder-input-id="panelButton"` | `settings.controlPanel.buttonColor` |
| `data-placeholder-input-id="panelActionButton"` | `settings.controlPanel.actionButtonColor` |
| `data-kdb-action="dashboard.settingsButtons.toggle"` | `settings.dashboard.hideWidgetSettingsButtons` (UI: checkbox in **Diagramme** sectie, rij 2; commit: `toggleDashboardChrome` met `key: "hideWidgetSettingsButtons"`) |
| `data-kdb-action="dashboard.suButtons.toggle"` | `settings.dashboard.hideSuButtons` (idem met `key: "hideSuButtons"`) |

**Bindings:** commits lopen via `kdbControl/settings/*` dispatch; `syncFrameworkViewFromState` leest `settings` en zet DOM-waarden (inputs + de twee dashboard-checkboxes). `bindFrameworkPrimitiveVisuals` en `bindFrameworkKdbActionToggles` mogen **niet** meer `setPlaceholderInput` / `setPlaceholderSelection` aanroepen voor bovenstaande ids/actions (denylist of equivalent).

---

## 7. Runtime (`_KDB.runtime.kdbControl`)

**Uitbreiding:** `abortControllers.settingsForm` — `AbortController` voor listeners die settings-commits en/of keydown-Enter registreren; `destroy` moet **abort** aanroepen naast `frameworkView` (volgorde: zie execution spec).

---

## 8. Events

Geen nieuwe emits of subscriptions voor deze settings-tranche.

---

## 9. Writers / internal helpers

`state/writers/writeSettingsSnapshot.js` was een no-op placeholder en hoort **niet** meer in het contractuele folder-layout **als** settings-gedrag via die writer liep. Settings mutaties: **inline in reducer** met shallow-copy helpers (bestaand reducer-patroon) of kleine factory-scope helpers in `createKdbControlReducer.js` — geen aparte writer-file verplicht zolang `state.mdc` (canonical writer = reducer) geldt.

---

## 10. Impact op `kdbControl.md` (samenvatting)

- **§3** — rij toevoegen: `abortControllers.settingsForm`.
- **§5** — readers-tabel: oude settings-rijen vervangen door §5 hierboven; internal writers: `writeSettingsSnapshot` verwijderen uit de opsomming; `writeFrameworkView` blijft indien nog gebruikt voor framework.
- **§7** — addendum: settings CP-1 introduceert **geen** nieuwe dependency op `_KDB.properties` writes; **geen** Cognos voor deze slice.
- **§9** — `writers/writeSettingsSnapshot.js` uit de boom verwijderen (of markeren als verwijderd in port).
- **§10** — bullet “Full settings UI implementation” **beperkt**: de vier secties uit §1 mogen met reducer+sync geïmplementeerd worden in de sandbox; brede product-settings + persistence blijven out of scope.

---

## 11. Approval

| Datum | Actor | Note |
|------|-------|------|
| 2026-05-13 | user (via Execution AI input) | CP-1 settings: state shape, startwaarden, toggle-only + key allowlist, geen shims, vier secties scope, docs only in deze levering. |
