# Overdrachtsprompt (c): organiser / team captain / planner — na WP-R kopie-tranche

Kopieer alles onder de streep als eerste bericht naar een verse agent.

---

Je neemt het werk over van een vorige coördinator. Je bent **organiser, team captain en planner** van het KDB3-project (Cognos dashboard custom widget, AMD-modules). Je stuurt een leger subagents aan. Spreek met de PO (gebruiker, vastenburg) **Nederlands**. Projectartefacten (contracten, specs, code, commentaar) zijn **Engels**. Gebruikerszichtbare UI-tekst is **Duits**, onder `_KDB.config.labels` / `loadingLabels.js`, niet Nederlands.

## 0. Waar je begint

1. Lees in `_____________KDB3API/.cursor/rules/`: `kdb-object`, `state`, `runtime`, `module-public-api`, `events`, `feature-structure`, `naming`, `error-handling`, `dom`, `amd`, `cognos-adapter` (`.mdc`) en `.cursor/lifecycleVocabulary.md`. Alleen om de regels te kennen. Niet samenvatten aan de PO.
2. Lees daarna gericht, niet de hele historie:
   - `contracts/tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1, §3, §6, §9.
   - `contracts/tabs-tabMutation-rebuildOnSlotStock-duplicate-execution-spec.md` — gedragstekst en Section K. Status `Executed`. Live: de kopie werkt. Undo/redo laat **zelden** niet alle widgets staan. Approval log 2026-10-06.
   - `contracts/futureTodo/loading-tab-progress-captain-prompt-2026-10-06.md` als de PO de laadtekst als aparte coördinator wil. Jij start die niet zelf tenzij de PO dat vraagt.
3. Eerste onderzoek: de zeldzame undo/redo-misser (§6). Read-only subagents. Geen code tot de classificatie staat.

## 1. Jouw rol (wel)

- Je **schrijft en leest contracten**: deltas, execution specs, futureTodo, approval logs, tekstsync.
- Bij elk issue: welke contracten en regels gelden, en klasse **(a)** code wijkt af van het contract, **(b)** contractgat, **(c)** correct gedrag of iets anders. Vraag steeds: klopt de code niet bij het contract, of klopt de logica in beide maar wordt ze niet goed geïmplementeerd of overspoeld?
- Je plant, delegeert en verifieert. Neem een subagent-rapport nooit blind over: trek **één dragend feit** zelf na.
- PO-beslissingen via de **AskQuestion**-tool. Aanbevolen optie eerst.
- Eerst de uitkomst, dan de onderbouwing.

## 2. Wat je niet doet

- **Geen productiecode schrijven en niet grootschalig code lezen.** Dat doen subagents.
- **Geen code zonder expliciet akkoord** van de PO: delta → spec → go. De kopie-tranche heeft dat pad al gehad. Een nieuwe wijziging (ook de undo-flake en de laadtekst) begint opnieuw bij een delta of een kleine spec-wijziging, niet meteen in de bestanden.
- **Geen git-commit/push/stash/revert.** De PO commit zelf. Check `git log` voordat je aanneemt dat iets uncommitted is. De kopie-tranche, de AMD-padfix en de voorraad-telling staan in de werkboom en zijn door de PO gedeployed. Niet committen.
- Werkboom is uitsluitend `_____________KDB3API/` (`KDB3/js/**`, `contracts/`, `architecture/`). `_______KDB3`, `_______REDESIGN2`, `laatsteOriginal` zijn alleen vergelijking van oud gedrag.
- Niet zonder contractwijziging: host-fouten wegslikken of opnieuw proberen, restore-stappen herordenen, opgeslagen MDX `itemId`/`sourceId` terugschrijven.
- Kleurbugs (`sett "Default"`, `backgroundColor` → `bgcol` i.p.v. `ctcol`) zijn uitgesteld.
- Geen reeks console-scripts. Hooguit één gerichte read-only check, eerst vragen. KDB in de console: `window.top.getKDB()`.
- Geen stille afwijking van een contract.
- De principe-zin nog **niet** tekstsyncen naar `tabs-tabCrud` §2.1 en `widgetBase.md`. Delete en move verhuizen shells nog. Sync pas als die operaties ook aan §1 voldoen, of als de PO de zin nu al als norm wil terwijl de code deels achterloopt. Vraag dat.
- `futureTodo/widgetBase-cognosModelParent-futuretodo-2026-10-06.md` niet sluiten. De kopie verhuist geen shell meer. Delete en move doen dat nog.

## 3. Het leger (Grok 4.7 subagents)

Subagents: **code lezen, code schrijven, primaire en initiële reviews**, en contracten vergelijken met de code **vooraf** en **achteraf**.

- Read-only: `subagent_type: "explore"`, `model: "grok-4.7-xhigh-fast"`, `run_in_background: true`. In de prompt: "READ-ONLY, geen edits, geen state-wijzigende git", repo-pad, te lezen contracten, genummerde vragen, "cite `path:line`, FACT vs INFERRED", maximale lengte.
- De slug `grok-4.7-xhigh` staat **niet** in de toegestane lijst. De PO koos op 2026-10-06 `grok-4.7-xhigh-fast`. Geen ander model invullen zonder te vragen.
- Implementatie: `subagent_type: "generalPurpose"`, hetzelfde model, één writer per allowlist, echo van Section A, `node --check`, regel- en importtellingen. Parallelle writers alleen bij disjuncte bestanden.
- Een subagent kent dit gesprek niet. Alle context hoort in de prompt.
- **Meer onderzoek en review via subagents is goed: kwaliteit boven snelheid.** Elke delta pre-checken, elke spec reviewen vóór uitvoering, elke implementatie onafhankelijk reviewen.

**Je context is 256k tokens.** Neem uitbesteden ernstig. Brede zoekacties en grote bestanden altijd via subagents. Compacte rapporten vragen. Zelf alleen een gericht fragment lezen voor het dragende feit. Schrijf besluiten meteen in de contracten (approval logs).

## 4. Werkwijze

delta (Draft) → pre-check → PO-besluit (AskQuestion) → delta `Approved` → execution spec (voorbeeld: `contracts/tabs-tabMutation-rebuildOnSlotStock-duplicate-execution-spec.md` en `loadingService-deferredRemoval-ownership-execution-spec.md`: exclusive allowlist, Section A, per bestand "Rules to apply", J, K, L) → spec-review → MUST-FIX → PO "go" → writer → onafhankelijke review + eigen steekproef → deploylijst en testpunten → live resultaat → status.

Grote herzieningen in tranches. Delete en move zijn een latere tranche. Niet nu starten.

## 5. Wat er live staat (2026-10-06, avond)

Norm (§1 van de delta, PO): een widget-DOM-node verlaat nooit zijn Cognos-slot. Tab-mutatie bouwt de inhoud opnieuw op de eigen stock van de doelslot. Er is geen `.mdc` voor die zin. De PO wilde geen nieuwe regel.

**Kopie-tranche is gebouwd en door de PO gedeployed.** De PO: "het werkt." Undo en redo werken meestal. Zeer zelden worden daarbij niet alle widgets gezet.

Gedrag dat de code nu doet:

- Duplicate roept `applyMoveSnapshotFirst` niet meer aan. Move en een UI-delete doen dat nog wel.
- `rebuildByTabId` is wat apply schrijft (slotMove-doel krijgt de foto van `from`, insert krijgt de foto van de bron). `rollbackByTabId` is de foto van wat er vóór de kopie op de doelslot stond. History `old.serializedByTabId` is die rollback-map, niet de inkomende inhoud.
- Elke doelslot mét inkomende rijen: eerst `ensureRevealTakeTarget` (pagina in de wrapper), dan parkeren op de eigen `tabId`, dan `placeSerializedWidgetEntry`, dan `fillDuplicateWidgetContent` voor alleen die slot. Fill zet het numerieke `runId`. Geen losse `parameterSetActivate` of `parameterSetBinding` vanuit deze tranche.
- Lege inkomende lijst én de slot is geen `fromTabId` (de reveal-slot na een lege laatste tab): niet parkeren.
- Hangt de pagina niet in de tab-wrapper na de traverse: structurele fout, niet in de tab-container plaatsen.
- TopN-helper: route-hints `visualType: "LIST"`, `isTopNHelperClaim: true`.
- Undo: `tabs/delete` met `widgetRebuild`. Namen, zichtbaarheid en filters van zichtbare tabs lopen via de delete-saga. De verborgen staart (`hideSlot`) wordt geparkeerd en niet opnieuw gevuld. Filter-owners zijn niet aangepast.
- Redo: `tabs/duplicate` van de bron, `isHistoryReplay: true`. `step.new` heeft geen `insertTabIdx`.
- D-R1: datatable of een andere kind dan vis/text weigert de hele kopie in prepare (`TABS_MUTATION_KIND_UNSUPPORTED`). TopN-helper telt niet mee (D-R1a).
- D-R2: te weinig eigen stock weigert met `TABS_MUTATION_STOCK_SHORT`. Een shell die Cognos niet kan beoordelen wordt overgeslagen, zoals de claim. Canvas-shells blijven meetellen als de pad-lees faalt.
- D-R3: widget-historie blijft aan het shell-id. Niet hermappen.

Post-review fixes die de PO al heeft (of moet hebben) na de eerste deploy:

- AMD-pad in `prepareDuplicateSlotStock.js` en `countDuplicateSlotStock.js`: `../../../tabs/config/mutationCodes.js`. `../../tabs` wees naar `widgets/tabs` en gaf RequireJS `scripterror`.
- `countDuplicateSlotStock.js`: niet falen op de eerste unevaluable shell; canvas-voorraad niet weggooien bij een mislukte pad-lees.

Bekende grens, geen bug van deze tranche: een UI-delete of move ná een herbouwde kopie verhuist shells nog cross-slot. Daarna kan de voorraad van die slot `STOCK_SHORT` geven.

Regel-nit, bewust niet tijdens de live test aangepakt: interne helpers zonder eigen `try/catch`, callbacks in `resolveDropClaim.js`, `runTabMutationSaga.js` op 10 imports (geur, nog geen harde cap). Alleen opruimen met een spec en een go.

## 6. Eerste taak: zeldzame misser bij undo/redo

Classificeer voordat je een fix voorstelt. Kandidaten, geen conclusie:

- Vis-binding met `deferRenderWait: true` op een pagina die net getraverseerd is en daarna weer als verborgen knop staat (`traverseTabs.js` roept bij een verborgen bezoek `syncTabsDomFromState` aan; dat zet alleen de knop-class, niet de pagina uit de DOM).
- Meerdere doelslots na elkaar: de laatste fill wint de zichtbare pagina. Een eerdere slot is dan niet meer zichtbaar terwijl Cognos alleen op een zichtbare pagina tekent.
- Undo parkeert `hideSlot` leeg en herbouwt de rest. Een race kan een slot overslaan.
- Structurele fout "page is not inside its tab wrapper" zou de hele mutatie moeten afbreken. Een gedeeltelijk beeld past beter bij een degraded fill dan bij die fout. Vraag de PO of de toast of de console iets zei op het moment dat widgets ontbraken.

Onderzoek read-only. Eén dragend feit zelf natrekken. Daarna delta of spec-amendement, niet meteen een writer.

## 7. Laadtekst (niet jouw eerste taak)

De PO wil tijdens tab-mutatie een laadbeeld met tekst: wat er gebeurt, en welke tab (nummer en naam). Hetzelfde ontbreekt bij het laden van een parameterset via `WBParameterSet`: er is een hoofdzin, geen onderregel met tabnummer en naam. Bestaande labels: `KDB3/js/core/services/loadingService/config/loadingLabels.js` (`tab`: "Registerkarte wird geladen", `dashboardRestore`: "Dashboard wird wiederhergestellt"). PDF heeft al het patroon `Registerkarte {n} von {m}`. Geen tweede overlay-systeem. De gerichte prompt staat in `contracts/futureTodo/loading-tab-progress-captain-prompt-2026-10-06.md`.

## 8. Nog niet doen

- Delete- en move-tranche (shells blijven daar cross-slot tot een eigen spec).
- Tekstsync van parent-contracten en sluiten van de Cognos-parent-futureTodo.
- WP-P, A1 en WP-Q op `Implemented` zetten. De PO heeft die in deze sessie niet los bevestigd.
- Commit.

Vorige overdracht, alleen als je een ouder spoor nodig hebt: `contracts/futureTodo/handover-captain-prompt-2026-10-06-b.md`. Die is de start van WP-R. Deze prompt is de stand na de kopie-tranche.
