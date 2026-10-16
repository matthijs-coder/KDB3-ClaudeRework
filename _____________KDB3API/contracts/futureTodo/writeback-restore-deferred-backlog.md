# Future TODO: Writeback Restore — Deferred Tasks & Later Buildout

> Backlog voor bewust uitgestelde onderdelen uit writeback tranche 2 (owner-restore-implementaties).
> Elk item is "eerlijk deferred": het huidige gedrag rapporteert de beperking expliciet (diagnostic/contract-notitie), er wordt niets gefaked.

---

**Aangelegd:** 2026-07-12, PO (vastenburg) + writebackSet-planner (Fable 5)
**Bronnen:** tabs-ronde reviews, legacy-wachtmodel-onderzoek (laatsteOriginal/KDB2), filterronde-planning

---

## T2 as-built (2026-08-17) — not Cognos-green, not parked

Pick-list: `contracts/futureTodo/t2-parameterSet-gaps-launch-prompt.md`.
Deltas live under `contracts/writeback-t2-item*.md`. No fourth backlog.

| Slice | Code | Cognos | Still deferred after this WP |
|---|---|---|---|
| **2 / 3** | none (contract-close) | n/a | GET skip-diagnostics unless PO names them |
| **4** `head.icon` | shipped | **open** | **cancelled:** toolbox picker, icon history (PO 2026-08-18: one icon forever) |
| **5a** inflight wait restore/reset | shipped | **open** | — |
| **5b** abort landing tab | shipped | **open** | `tabs:changed` suppress for whole SET (§3.1); filt-only **success** without step 28 (DOM stays on last page-context tab) |
| **5c** activate `getCanvasWhenReady` | shipped | **open** | global `waitFor: "canvas"`; per-widget paint on activate (**C**). §2.4 is letter **B** |
| **1** v2-import / `writebackMap` | **not started** | — | skeleton → `WRITEBACK_UNSUPPORTED_LEGACY_FORMAT` |
| **T3** folder regroup | **done 2026-08-18** | n/a | SS/DS/NMS `actions/` → `parameterSet/` + `tabMutation/` |

Do **not** mark §2.1 / §2.4 / §3.1 / §3.2 done until PO Cognos on 5c / **B** / 5b / 5a.

Open outside those slices: §1.2 GET-fixture, §2.3 reserved traverse names, §3.3 class-toggle, §3.4 tabs undo, §5.1 `sichtChange`, §6.1 duplicate SS labels, §6.2 `maxUserTabs` SSOT, §7 shell-create. §5.2 `seq` remains vervallen.

---

## 1. Data / configuratie die PO moet aanleveren

### 1.1 `bwOldToNewMap.js` (BW oud→nieuw) — **filled 2026-08-16**
- **Wat:** `KDB3/js/core/config/mapping/bwOldToNewMap.js` (mapping SSOT WP). Pairs copied from KDB2 `mapOldBwToIdHelper.js`; `null` values omitted; `"MAG":"MAG"` kept once. Old path `dashboard/filters/dienststelle/config/bwOldToNewMap.js` deleted.
- **Gedrag:** unmapped labels still emit `WRITEBACK_DIENSTSTELLE_BW_LABEL_UNMAPPED`; mapping never runs in normal reconcile/default paths (CP-3).
- **Actie PO:** none for the helper dump; Cognos acceptance of restore with an old BW label remains a PO STOP.

### 1.2 GET-fixture uit live Cognos
- **Wat:** verse `WBParameterGetFunction()`-JSON (descriptief v3-formaat) van een dashboard mét sicht/dienststelle/single-select-filters, als round-trip-fixture.
- **Status:** round-trip-testen draaien al in Cognos (tabs-ronde); fixture is triviaal te trekken maar nog niet vastgelegd.

## 2. Readiness / render-barrier (widget-ronde + readiness-delta)

### 2.1 Echte canvas-render-barrier ("canvasReady" eerlijk maken) — **in progress T2-5c 2026-08-17**
- **Nu (pre-5c):** `canvasReady` = "tab geklikt + 150ms" (optimistisch, tabs-delta D3). writebackSet consumeert het veld nog niet.
- Promoted (activate only): `contracts/writeback-t2-item5c-contractdelta.md` — `parameterSetActivateTabRequested` awaits bounded `getCanvasWhenReady` after click + 150ms. Do not mark done until Cognos. 5a/5b stay in progress (not Cognos-green).
- **Later (still deferred):** per live widget `getWidgetWhenReady` + `whenRenderComplete` on activate (legacy 2,5s per tab-widget, 3-12s elders). Global `waitFor: "canvas"` (PDF/GET/mutation) stays click + 150ms. Alle primitieven blijven Cognos-API-gebaseerd → wrappers onder `_KDB.cognosAPI`, geen DOM-scraping.
- **Legacy-lessen:** timeouts bounded en non-fataal waar mogelijk (degraded-outcome, niet abort); marges klein en gericht (100-200ms), geen blinde 2000ms-pauzes.

### 2.2 `waitFor: "widgetsRendered"` (tabs traverse) — GEDAAN 2026-07-13
- **Geïmplementeerd:** widgets-owned readiness-API `widgetBase/renderTabWidgetsRequested` (render + bounded `whenRenderComplete`, 2.5s cap per widget, parallel per tab); tabs traverse consumeert die per geactiveerde tab; post-restore traverse (stap 28) draait ermee en landt op de eerste zichtbare tab (`restoreTabIndex`). Fix voor: widgets bleven leeg na restore tot handmatige tabwissel.
- **Rest:** `parameterSetActivateTabRequested` canvas-API wait is T2-5c (in progress). Per-widget paint on activate remains deferred; step 28 already uses `widgetsRendered`.

### 2.3 Gereserveerde tabs-acties
- `tabs/waitUntilTraversed`, `tabs/retraverse` — namen gereserveerd, geen P0.

### 2.4 Writeback one-shot lazy-render-gaps (sweep 2026-07-13)
Patroon-sweep na de lazy-render-bugfixronde (widgetBase-routing, kdbControl-tabFollow, dragDrop-rebind): geen nieuwe `firstActivation`-muren in runtime-paden; wel twee one-shot-gaps in de writeback-restoreketen, die — anders dan de event-gedreven runtime-paden — geen `tabs:changed`-herstelmoment hebben. Beide hangen samen met 2.1 (echte canvas-barrier) en zijn pas relevant zodra restore tegen trage lazy renders draait:
- **Page-context filter restore:** `runFilterRestore` activeert de tab (T2-5c: click + 150ms + bounded `getCanvasWhenReady`) en singleSelect leest direct daarna de Cognos page-context API; één poging, hard `TARGET_MISSING` bij te trage host-registratie. Later: bounded poll/retry op page-context-registratie vóór de harde fail.
- **`ensureTabWidgetsRouted` in restore:** één aanroep per tabtarget; bij `missingShells > 0` blijft de tab runtime-retryable, maar de restore-fase kan `ok: true` rapporteren terwijl pre-restore widgets nog niet geparkeerd zijn (step-24-claims kunnen dan shells missen). Later: `missingShells` in het faseresultaat meenemen (bounded re-ensure of degraded-diagnostic).
- **B GO 2026-08-18:** owned by `contracts/writeback-restore-missingShells-contractdelta.md` (Implementing; Cognos later). Do not fold **C**.
- **Geaccepteerde restcaps:** kdbControl-tabFollow ~4s en dragDrop-rebind ~3s zijn bewust begrensd en herstellen bij elke volgende activatie; geen actie.

## 3. Tabs — openstaande verificaties en opties

### 3.1 activeIndex-race / abort-scenario — **in progress T2-5b 2026-08-16**
- **Risico:** `observeActiveTab` commit tijdelijke restore-activaties als `activeIndex` (feitelijk correcte DOM-spiegel); zelfherstellend via post-restore-traversal, MAAR bij een afgebroken run blijft de laatst geactiveerde restore-tab actief (DOM + state).
- Promoted: `contracts/writeback-t2-item5b-contractdelta.md`. Do not mark done until Cognos. 5a stays in progress (not Cognos-green).
- **Optie indien races blijken:** suppressie van alleen de `tabs:changed`-emit (niet de state-commit) tijdens een parameterSet-run — **still deferred**.
- **Filt-only success (niet 5b):** `runNormalRestore` slaat step 28 over als `v3.tabs` en `v3.wgts` ontbreken. Abort landing dekt fail/cancel; succes-landing op de user-tab na alleen-filter restore is geen T2-5b-item.

### 3.2 `waitForInflightTraversals` op restore/reset — **in progress T2-5a 2026-08-16**
- Contractdelta `tabs-parameterSetRestore-contractdelta.md` §4 (item 2) vereist het; live code wachtte alleen op activate/post-traverse.
- Promoted: `contracts/writeback-t2-item5a-contractdelta.md`. Do not mark done until Cognos.

### 3.3 Class-toggle-fallback voor hidden-tab-activatie
- Alleen bouwen als een Cognos-versie programmatic clicks op verborgen tab-buttons blijkt te negeren (huidige aanpak werkt: click + defensieve re-hide).

### 3.4 Tab history-integratie
- Tabs heeft geen history-machinerie; `skipHistory` accepteren volstaat voor restore. Volledige history-integratie (undo/redo van tab-wijzigingen) is een aparte latere ronde.

## 4. Efficiënte tab-operaties (move/copy/delete) als owner-acties
- **Legacy:** tab-ops = volledige GET → in-memory `adjustTabObj` → volledige SET (`notDefaultParamSet`) → complete dashboard-reset + rebuild. Traag: dubbele round-trip, `resetKDB`, alle widgets herbouwd.
- **Later (aparte contractdelta op de tabs-owner):** `tabs/moveRequested`, `copyRequested`, `deleteRequested` die de parameterSet-primitieven hergebruiken, gescoped op alleen betrokken tabs: park/claim via launchpad (widgetBase), tab-toewijzing in owner-state, page-context-filters per betrokken tab verhuizen (singleSelect), naam/visibility via tabs-reducer. Niet-betrokken tabs blijven live incl. Cognos-bindings.
- **Besluit 2026-07-11 (PO):** buiten tranche 2; architectuur blokkeert het niet.

## 5. Writeback schema / statussen

### 5.1 `status "sichtChange"` (gereserveerd)
- Tranche-1-besluit: gereserveerd/deferred. Bij promotie moet de sicht-owner-delta change-semantiek definiëren i.p.v. cold-start-semantiek.

### 5.2 `seq` (widget-sequences) — vervallen
- PO-besluit 2026-07-12: sequences zijn geen onderdeel meer van het project. `seq` is uit het v3-schema, de writeback-code en alle contracten verwijderd; er is geen deferred werk meer op dit punt.

## 6. Filter-domein — restrisico's na de filterronde

### 6.1 singleSelect page-context per label
- **Update 2026-08-10:** GET/SET-mitigatie geïmplementeerd — instance-inventory + `tabs/resolveFilterScopeTargets` liveScope-matching; `filt.sels[]` draagt optioneel `inst`/`tab`.
- State keyt page-context op `filterLabel`; zelfde label op meerdere tabs kan colliden. Mitigaties uit de filterronde (2026-07-12): restore registreert per run (key→tab→scopeId)-toewijzingen in runtime zodat resync nooit cross-tab broadcast; GET leidt de tab-toewijzing af via Cognos page-context-items + tabTargets en skipt colliding labels met diagnostic. Een volwaardig per-scope-statemodel blijft nodig zodra dashboards met duplicate labels over tabs in gebruik blijken (dan collidet ook de owner-state zelf).

### 6.2 GET/SET `maxUserTabs`-bron
- Micro-fix in de filterronde harmoniseert `collectTabs` en `listDashboardSlots`; structureel hoort de limit uit één bron (`state.limits`) te komen — bewaken bij toekomstige tabs-wijzigingen.
- **As-built 2026-08-17:** GET collectors `collectTabs.js` / `collectWidgets.js` use the same fallback as `listDashboardSlots.js` (`tabs/config/defaults.js` `MAX_USER_TABS`) when `state.limits.maxUserTabs` is unset. Hardcoded `5` fallbacks in `tabMutationPostconditions.js`, `reduceTabMutationApply.js`, `buildTabDuplicatePlan.js` now read that default too. Happy path still uses `state.limits` (seeded by `createInitialTabsState`).

## 7. Widget shell-aanvoer (create-pad voor surplus-entries)
- **Nu (PO-besluit 2026-07-12, widgetBase-restore-delta §4b):** restore claimt shells die door `parameterSetResetRequested` op de launchpad zijn geparkeerd. Entries waarvoor geen passende shell beschikbaar is (parameter-set met méér/andere widgets dan aanwezig) falen eerlijk met `WRITEBACK_WIDGET_RESTORE_FAILED` per entry.
- **Later:** owner-approved shell-create-pad (Cognos createWidget-wrapper onder `_KDB.cognosAPI` of launchpad-seed) zodat restore ook shells kan aanmaken die niet uit de reset-park voortkomen. Vereist onderzoek naar de Cognos-API voor programmatische widget-creatie; tot die tijd geen fake shells.

## 8. Serialisatie-drift (geaccepteerd, gedocumenteerd)
- Header/footer: na default-restore is status `"removed"` (niet `"idle"`), waardoor GET `{on: 0}` serialiseert i.p.v. omissie. Gedragsidentiek; vastgelegd in beide deltas (PO 2026-07-10). Alleen relevant als omissie-semantiek ooit betekenis krijgt.
