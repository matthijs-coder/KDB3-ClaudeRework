# Writeback — aanvulling op `writeback.md` (handoff naar zwaarder model)

> **Lees eerst** `writeback.md` (volledige gespreksoutput + subagent-onderzoek).  
> **Lees daarna dit document** — het filtert ruis, corrigeert prioriteiten en formuleert de opdracht.

---

## 1. Hoe `writeback.md` lezen

`writeback.md` is een chronologisch transcript. **Niet alles geldt nog equally.**

| Sectie in `writeback.md` | Status |
|--------------------------|--------|
| §1–3 (doel, architectuurvergelijking, module-plaatsing) | **Geldig** — met correcties hieronder |
| §4 (hybride model / legacy-achtig schema v1) | **VERVALLEN** — productbeslissing: géén legacy-formaat als opslag |
| §5–8 (get/set/map/fasering op legacy schema) | **Gedeeltelijk geldig** — flows en gaps kloppen; datamodel moet v3 zijn |
| Vanaf ~regel 374 (correctie richting v3 compact) | **Leidend** voor datamodel en map-strategie |
| 3-services discussie (~regel 607) | **Leidend** — definitieve structuur |
| Proces/handoff (~regel 727) | **Leidend** voor workflow |

**Eén zin samenvatting:** bouw **get → v3**, **set ← v3**, **map: legacy (v0/v1/v2) → v3**; opslag in DWH = **alleen v3**, zo compact mogelijk.

---

## 2. Hoogtepunten — wat je moet onthouden

### 2.1 Productbeslissingen (vast, niet heropenen zonder expliciete PO-input)

1. **Geen legacy JSON als opslagformaat** — Cognos IDs, dubbele display-waarden, lange keys en metric-metadata horen niet in de DWH-blob.
2. **Nieuw compact v3-schema** — semantisch (business keys), delta-encoding t.o.v. defaults, numerieke canvas-waarden, geen `widgetId` als persistente key.
3. **Drie services + één gedeeld schema-contract** — `writebackGet`, `writebackSet`, `writebackMap` + gedeelde `schema/` (single source of truth).
4. **`set` accepteert alleen v3** — geen stille fallback naar map; expliciete fout bij verkeerde versie.
5. **`map` is de zware vertaallaag** — schema-adapters (v0/v1, v2) + semantic mapping (KID, pakket, Dienststelle hierarchy, metrics/slots).
6. **Restore via bestaande KDB3 dispatch-paden** — geen directe Cognos-bypass; anders race conditions en incomplete widget binding.
7. **Dienststelle hierarchy-validatie alleen bij restore** — CP-3 (`contracts/WBParameterSet.md`); niet terugbrengen in normale filter flows.

### 2.2 Architectuurankers in KDB3

- Entry: `KDB3/js/KDB.js` — bootstrap, `_KDB.state` / `_KDB.api` / `_KDB.services`.
- Services-patroon: `core/services/__orchestratorServices.js` (cf. `widgetBindingPlan` + `widgetBindingApply` als duo).
- Relevante state voor get:
  - `kdbControl/state/initialState.js` — defaults voor delta-encoding
  - `widgetSettings/effects/buildWidgetVisSettingsSnapshot.js` — `{ dimension, visType, topNChoice }`
  - `filters/dienststelle/state/` — resolution, `byFilter`, hierarchy snapshots
  - `widgetBase/state/selectors.js` — placement, layout
- Writeback **bestaat nog niet** in KDB3 JS; WritebackTabel staat in `core/config/tables.js` met `load: false`.
- Contracts expliciet deferred: `contracts/WBParameterSet.md`, `contracts/dienststelle.md` (restoreFromParameterSet).

### 2.3 Legacy referentie (alleen voor map, niet voor opslag)

- Bron: `laatsteOriginal/KDB2/js/writeback/` (get, set, map + helpers).
- Oude map = **pakket-migratie binnen hetzelfde schema** (KID universalize/de-universalize), geen schema-translator.
- Oude restore-volgorde is leidend voor **set-orchestratie** (reset → canvas → header → filters → Dienststelle orchestrator → widgets → tabs → config).
- Status-waarden set: `"notDefaultParamSet"`, `"default"`/`"defaultParamSet"`, `"newDashboard"`, `"sichtChange"`.

### 2.4 Grootste risico's (P0)

| Risico | Waarom |
|--------|--------|
| `restoreDienststelleFromParameterSet` ontbreekt | Grootste functionele gap in set |
| v0/v1 adapter zonder DWH-samples | Map-specificatie wordt giswerk |
| Schema-drift tussen get en map | Zonder gedeelde `validateV3`/`normalizeV3` |
| WidgetId-instabiliteit na reset | Legacy gebruikte `parameterSetRestoreRunId` — ontbreekt in KDB3 |
| Binding pipeline timing | set moet widgetVis gates respecteren (contentReady, dienststelle gate) |

---

## 3. Opdracht aan het zwaarder model

### 3.1 Primair deliverable

Lever een **implementatie-ready ontwerp** (contract-niveau, nog geen productiecode tenzij expliciet gevraagd):

1. **Formeel v3-schema** — veld-voor-veld: types, defaults, verplicht/optioneel, delta-regels, voorbeeld-minimal en voorbeeld-maximal payload.
2. **Publieke API** per service — methoden, input/output, async-gedrag, foutcodes.
3. **Mapping-matrix** — v2→v3 per veld; v0/v1→v3 waar mogelijk (markeer gaps expliciet).
4. **Set restore-spec** — genummerde stappen, per stap: welke `_KDB.api.*.dispatch` / service, welke bestaande replay handler hergebruikt wordt.
5. **Module-structuur** — bestandsboom onder `core/services/writeback/` incl. orchestrator-registratie.
6. **Faseplan** — tranches met acceptatiecriteria en testscenario's (round-trip, legacy import, edge cases).
7. **Contract-delta's** — welke bestaande contracts (`WBParameterSet.md`, `dienststelle.md`, evt. `widgetBase.md`) moeten worden geactiveerd/aangevuld.

### 3.2 Secundair (indien ruimte)

- Cognos bridge-spec (`window.top.WBParameterGetFunction` / `WBParameterSetFunction`).
- DWH-kolomadvies naast blob (`schema_version`, `pkg`, compressie).
- Grootte-inschatting legacy vs v3 op conceptueel voorbeeld-dashboard.

### 3.3 Expliciet buiten scope (tenzij PO anders beslist)

- Volledige KDB3-codebase opnieuw inventariseren.
- Legacy writeback 1:1 porten.
- WritebackTabel CRUD / `load: true` in fase 1.
- Implementatie van domeinmodules buiten writeback (behalve benodigde restore entry points specificeren).

### 3.4 Constraints (hard)

- AMD/RequireJS, `define([...])` — match bestaande KDB3 conventies.
- Geen legacy JSON als DWH-opslagformaat.
- `set` = alleen v3; `map` = enige legacy-ingang.
- Restore via dispatch; geen parallel Cognos-eigenaarschap naast bestaande modules.
- Dienststelle hierarchy-validatie **alleen** op restore-pad (CP-3).
- `writebackTable`-widgets overslaan (bestaande `WRITEBACK_TABLE` skip in widgetBase).

---

## 4. Open productbeslissingen — invullen vóór implementatie

Deze vragen blokkeren detailontwerp. **Geef antwoord, of schrijf expliciet “default OK: …”.**

| ID | Vraag | Opties | Voorlopige aanbeveling |
|----|-------|--------|------------------------|
| **Q-A** | Korte keys in blob (`v`, `fl`, `wg`) vs leesbare keys? | A / B | **A** voor DWH; schema-doc in metadata |
| **Q-B** | Widget-encoding: array-tuples vs kort object? | tuple / object | tuple = kleiner; object = debug-vriendelijker |
| **Q-C** | `localFilters` per widget opslaan in v3? | ja / nee / afleiden | legacy sloeg op, mapte niet — **neef of afleiden** tenzij business vereist |
| **Q-D** | Filter display values (`d`) nooit opslaan? | ja / nee | **ja** — alleen useValue |
| **Q-E** | History stack bij restore? | reset / behoud | **reset** |
| **Q-F** | Cognos `WBParameterGetFunction` output? | direct v3 / legacy wrapper | **direct v3** + bridge voor dropdown-load met map |
| **Q-G** | Map-scope: welke legacy-generaties in DWH? | v2 only / v0+v1+v2 | **onbekend** — blokker: 1–2 echte DWH-samples nodig |
| **Q-H** | Implementatie-prioriteit? | get+schema eerst / map parallel voor migratie | get+schema eerst; map zodra v3 vast + samples |
| **Q-I** | `moveToFirstTabAndBack` bij get? | DOM-truc / Cognos tab API / beide | valideren in onderzoek — Cognos API-first indien betrouwbaar |
| **Q-J** | Canvas restore via? | kdbControl dispatch / canvas.dispatch | kdbControl (canvas.dispatch is stub) |

---

## 5. Wat nog ontbreekt in `writeback.md` (bewust aan te vullen)

### 5.1 Blocker: legacy DWH-samples

Zonder **1–2 geanonimiseerde parametersets** uit het datawarehouse is de v0/v1-adapter speculatief.

**Actie voor PO/planner:** lever samples vóór map-contract definitief is.

### 5.2 Blocker: `parameterMapping` in KDB3

Map hangt af van KID → concrete waarde. Legacy: `_KDB.widgetProperties.parameterMapping`.

**Nog te verifiëren:** bestaat dit al in KDB3 (`core/config`, `properties`)? Zo niet: ontwerp locatie + shape als onderdeel van fase 0.

### 5.3 Nog geen formele deliverables

- Veld-voor-veld v3-schema (alleen concept in `writeback.md`).
- Mapping-matrix v2→v3 per veld.
- Exacte API-signatures + error enum.
- Restore-spec gekoppeld aan concrete `actionTypes` per module.
- Test-fixtures / acceptatietests beschreven.

→ Dit is precies wat het zwaardere model moet opleveren.

---

## 6. Aanbevolen gerichte investigation (planner → subagents)

**Niet** opnieuw de hele architectuur verkennen. Wel deze **4 read-only** onderzoeken vóór of parallel aan detailontwerp:

| # | Onderwerp | Pad / focus | Gewenste output |
|---|-----------|-------------|-----------------|
| **I-1** | `parameterMapping` in KDB3 | `KDB3/js/core/config/`, `properties/`, grep `parameterMapping` | bestaat/waarde/shape vs legacy |
| **I-2** | Restore-paden per domein | `filters/sicht`, `dienststelle`, `singleSelect`, `widgetSettings`, `widgetBase`, `widgetVis` — dispatch + history replay | tabel: domein → action/API → volgorde |
| **I-3** | Dienststelle restore gap | `contracts/dienststelle.md`, `contracts/WBParameterSet.md`, legacy `filters/hierarchy/restoreFromParameterset/` | wat moet nieuw; welke legacy-logica hergebruiken |
| **I-4** | Cognos writeback wiring | KDB3 extension/host, `#saveParameterSet`, `#selectParameterSet`, `window.top.WBParameter*` | waar bridgen; welke callers naast Cognos dropdown |

**Optioneel I-5:** legacy vs concept-v3 byte-grootte op 1 dashboard (businesscase DWH).

Subagent-instructie: **read-only, geen code schrijven.**

---

## 7. Leeslijst codebase (gericht, niet alles)

| Prioriteit | Bestand / map | Reden |
|------------|---------------|-------|
| P0 | `laatsteOriginal/KDB2/js/writeback/` | Legacy get/set/map gedrag |
| P0 | `KDB3/js/core/services/__orchestratorServices.js` | Service-registratie patroon |
| P0 | `contracts/WBParameterSet.md` | Dienststelle restore + CP-3 |
| P0 | `contracts/dienststelle.md` (restore secties) | Deferred scope |
| P1 | `KDB3/js/dashboard/widgets/widgetSettings/effects/buildWidgetVisSettingsSnapshot.js` | v3 widget-vis subset |
| P1 | `KDB3/js/dashboard/canvas/kdbControl/state/initialState.js` | defaults delta-encoding |
| P1 | `KDB3/js/dashboard/filters/dienststelle/state/` + selectors | filter compact model |
| P1 | `KDB3/js/dashboard/widgets/widgetBase/state/selectors.js` | placement/layout |
| P1 | `contracts/widgetBase.md` (writeback/restore secties) | bewuste skips + grenzen |
| P2 | `KDB3/js/core/config/tables.js` (`writeback`, `load: false`) | toekomstige CRUD |

---

## 8. Voorgestelde module-structuur (definitief voorstel)

```
core/services/writeback/
├── schema/                         ← SINGLE SOURCE OF TRUTH
│   ├── v3Defaults.js
│   ├── validateV3.js
│   ├── normalizeV3.js
│   └── detectSourceFormat.js
├── get/
│   ├── createWritebackGetService.js
│   └── collectors/                 ← canvas, settings, filters, tabs, widgets
├── set/
│   ├── createWritebackSetService.js
│   └── effects/                    ← restore plan, reset, sequenced dispatch
├── map/
│   ├── createWritebackMapService.js
│   └── adapters/                   ← v0v1, v2, semantic (KID, hierarchy, slots)
├── cognosWritebackBridge.js        ← window.top WBParameter* (dun)
└── __orchestratorWriteback.js
```

Registratie (voorstel):

```javascript
_KDB.services.writebackGet   // collect(options?) → v3 object
_KDB.services.writebackSet   // restore(v3, status?) → Promise<void>
_KDB.services.writebackMap   // toV3(raw, options?) → v3 object
```

Dependency-richting: `schema` ← get, map, set; **geen** map → set import.

---

## 9. Acceptatie — wanneer is het ontwerp “klaar voor implementatie”?

- [ ] v3-schema is compleet genoeg om snapshot-tests te schrijven zonder interpretatie.
- [ ] Elke v3-sectie heeft een get-collector en set-restore stap met named dispatch/action.
- [ ] v2→v3 mapping-matrix dekt alle velden die in legacy voorkomen, of markeert bewuste drops.
- [ ] v0/v1 scope is expliciet: in scope + samples, of out of scope + motivatie.
- [ ] Dienststelle restore-pad sluit aan op `WBParameterSet.md` (hierarchy validation alleen bij restore).
- [ ] Fase 0–4 hebben meetbare acceptatiecriteria (incl. round-trip `set(get())` en legacy import `set(map(raw))`).
- [ ] Geen open Q-A t/m Q-J, of expliciete defaults vastgelegd.

---

## 10. Workflow na dit document

```
writeback.md (context)  +  writebackExtra.md (dit document)
        ↓
PO beantwoordt §4 (open vragen) + levert DWH-samples (§5.1)
        ↓
Planner: 4 gerichte subagents (§6) → korte bevindingen bijvoegen
        ↓
Zwaarder model: deliverables §3.1
        ↓
PO review → implementatie-tranches
```

---

## 11. Rolverdeling

| Rol | Verantwoordelijkheid |
|-----|---------------------|
| Eerdere planner (Auto) | Richting, trade-offs, v3-concept, 3-services, gap-inventaris |
| PO / gebruiker | Beslissingen §4, DWH-samples, go/no-go |
| Planner + subagents | Gerichte feiten §6 |
| **Zwaarder model** | Formeel schema, API, mapping-matrix, restore-spec, faseplan |
| Implementatie-agent | Code per goedgekeurd contract |

---

*Documentversie: 2026-06-18 — aanvulling bij `contracts/overdracht/writeback.md`*
