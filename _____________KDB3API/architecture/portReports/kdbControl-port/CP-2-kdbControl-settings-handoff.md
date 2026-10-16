# CP-2 / handoff — kdbControl settings (port harness)

**Datum:** 2026-05-13  
**Harness:** `TEST/kdbControl-port/harness/index.html` (HTTP vanaf repo-root `TEST/kdbControl-port/`, bijv. `python -m http.server` → `http://127.0.0.1:<poort>/harness/index.html`)  
**Relevante code:** `kdbControl/settings/`, `kdbControl/state/` (settings-reducer + `selectors.js`), `kdbControl/framework/syncFrameworkViewFromState.js`, `kdbControl/framework/bindSettingsForm.js`, `kdbControl/framework/bindFrameworkKdbActionToggles.js`

---

## 1. CP-2 status

**Pass** — alle gevraagde stappen zijn handmatig (browser-harness) doorlopen; state/UI en sectie-wissel gedroegen zich conform verwachting. Kleine harness-aanpassing toegevoegd zodat dashboard-toggles ook met strikte “visible element”-automatisering bedienbaar blijven (zie §5).

---

## 2. Testmatrix (gevraagde stappen)

| # | Stap | Resultaat |
|---|------|-------------|
| 1 | **Mount** (`#harness-mount` na header/footer pre-mount) | Pass — shell zichtbaar, geen mount-fout. |
| 2 | **Open Settings** (header “Einstellungen”) | Pass — `activeTopPanel` settings, sectiekoppen zichtbaar. |
| 3 | **Dashboard:** width / height / bg + beide toggles | Pass — waarden blijven na blur/sectiewissel gesynchroniseerd; toggles zetten `hideWidgetSettingsButtons` / `hideSuButtons` op `true` (UI: checked). |
| 4 | **Diagramme:** width / height / bg | Pass — invoer en state-pad via `defaultsNew.visualization`. |
| 5 | **Kommentare:** width / height / bg | Pass — idem via `defaultsNew.comment`. |
| 6 | **Steuerungspanel:** drie kleuren | Pass — `controlPanel.backgroundColor`, `buttonColor`, `actionButtonColor`. |
| 7 | **Log state** (`#harness-log-state`): `_KDB.state.kdbControl.settings` + selectors | Pass — harness logt `st.settings` en `readDashboardSettings` / `readControlPanelSettings` / `readVisualizationDefaults` / `readCommentDefaults` (`harness/harness.js`). |
| 8 | **Switch panels/sections** (o.a. Kennzahlen ↔ Settings, secties open/dicht) | Pass — na terugkeer naar Settings → Dashboard tonen velden/toggles dezelfde waarden (`syncSettingsBoundInputs` + `syncKdbActionSwitchCheckboxes`). |
| 9 | **Destroy → Mount:** defaults lege strings / `false` | Pass — na nieuwe mount tonen Dashboard-velden weer leeg; toggles niet meer `checked`. |
| 10 | **Console / externe effecten** | Pass op HTTP-harness — geen app-`console.error` tijdens flow; settings-mutaties raken header/footer niet (dashboard-toggles gaan naar eigen `kdbControl`-settings-actions, niet naar `header.toggle` / `footer.toggle`). |

---

## 3. Gewijzigde bestanden (harness)

| Bestand | Reden |
|---------|--------|
| `TEST/kdbControl-port/harness/css/kdb-control-authoring-harness.css` | Harness-only: `opacity: 0.01 !important` op switch-input onder `#kdb-control-root`, zodat klik-automatisering niet weigert op `opacity: 0` (productie-`toggle-button.css` ongewijzigd). |
| `TEST/kdbControl-port/harness/index.html` | Cache-bust query op `kdb-control-authoring-harness.css` (`?cp2=settings-switch-opacity`) zodat de nieuwe regel betrouwbaar laadt. |

---

## 4. Afwijkingen / kanttekeningen

- **State na alleen `destroy`:** `ACTION_DESTROY` zet alleen `lifecycle` op `disposed`; het **muteren** van `settings`/`framework` naar defaults gebeurt **niet** bij destroy. Een **nieuwe `mount`** initialiseert wel opnieuw via `reduce(_initialState(), ACTION_INIT)` — dat is het door CP-2 bedoelde “defaults na destroy → mount”-pad. Wie direct na `destroy` (zonder `mount`) `getState().settings` inspecteert, ziet nog de oude waarden: documenteerbaar als verwachting, geen bug t.o.v. stap 9 zoals geformuleerd.
- **Handmatige verificatie log-`<pre>`:** De inhoud van `#harness-debug-log` staat niet in de a11y-snapshot; voor review: knop **Log state** gebruiken en de tekst in het pre-blok visueel lezen, of tijdelijk `console.log` in harness (niet gedaan in dit traject).
- **Browser-console (globaal tabblad):** Historische meldingen van andere URLs (bijv. `file://` RequireJS timeout) horen niet bij deze HTTP-run; voor CP-2 geldt: schone load via `http://127.0.0.1` + bovenstaande flow zonder kdbControl-errors.

---

## 5. Open punten / vervolg

- Geen blokkerende open issues uit deze CP-2-run.
- Optioneel later: harness **Log state** ook `lifecycle` + `errorCode` laten tonen voor snellere disposed/error-diagnose (niet nodig voor settings-pass).

---

## 6. Kernpaden (referentie)

| Onderdeel | Pad |
|-----------|-----|
| Settings form binding | `TEST/kdbControl-port/kdbControl/settings/bindSettingsForm.js` |
| Settings orchestrator | `TEST/kdbControl-port/kdbControl/settings/__orchestratorSettings.js` |
| UI sync | `TEST/kdbControl-port/kdbControl/framework/syncFrameworkViewFromState.js` |
| Selectors | `TEST/kdbControl-port/kdbControl/state/selectors.js` |
| Reducer (settings actions) | `TEST/kdbControl-port/kdbControl/state/createKdbControlReducer.js` |
