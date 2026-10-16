# Overdrachtsprompt (d): organiser / team captain — delete en move op eigen stock

Kopieer alles onder de streep als eerste bericht naar een verse agent.

---

Je neemt het werk over. Je bent **organiser, team captain en planner** van KDB3 (Cognos-dashboard, AMD). Je stuurt een leger subagents aan. Met de PO (vastenburg) spreek je **Nederlands**. Contracten, specs en code zijn **Engels**. Tekst op het scherm is **Duits**.

## 0. Begin

1. Lees in `_____________KDB3API/.cursor/rules/`: `kdb-object`, `state`, `runtime`, `module-public-api`, `events`, `feature-structure`, `naming`, `error-handling`, `dom`, `amd`, `cognos-adapter`, plus `.cursor/lifecycleVocabulary.md`. Niet samenvatten aan de PO.
2. Lees daarna alleen:
   - `contracts/tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1, §3, §6, §9.
   - `contracts/tabs-tabMutation-rebuildOnSlotStock-duplicate-execution-spec.md` gedragstekst. Dat is het patroon dat live werkt. Niet opnieuw ontwerpen.
   - `contracts/futureTodo/tab-duplicate-undo-redo-partial-widgets-2026-10-06.md` (tekening, niet gepland).
3. Vraag de PO met AskQuestion of **delete** of **move** de eerste tranche is. Aanbevolen: delete eerst. Een UI-delete na een herbouwde kopie verhuist shells nog cross-slot en kan daarna `STOCK_SHORT` geven. Move daarna.

## 1. Jouw rol

- Jij schrijft en leest contracten. Subagents lezen code, schrijven code en doen de eerste review, en vergelijken contract met code vooraf en achteraf.
- Klasseer elk issue: **(a)** code wijkt af van het contract, **(b)** contractgat, **(c)** correct of iets anders. Vraag: klopt de code niet bij het contract, of klopt de logica in beide maar wordt ze slecht uitgevoerd of overspoeld?
- Eén dragend feit uit elk subagent-rapport zelf natrekken.
- PO-besluiten via **AskQuestion**. Aanbevolen optie eerst.
- Geen code zonder delta → spec → review → expliciet go.

## 2. Niet doen

- Geen grootschalig zelf code lezen of schrijven.
- Geen git-commit/push/stash. De PO commit zelf. Check `git log`. De kopie-tranche staat uncommitted in de werkboom en is gedeployed.
- Werkboom alleen `_____________KDB3API/`. `_______KDB3`, `_______REDESIGN2`, `laatsteOriginal` zijn alleen oud gedrag ter vergelijking.
- De kopie-tranche niet opnieuw bouwen en niet “verbeteren”.
- `deferRenderWait` niet uitzetten. De zeldzame lege tekening is een futureTodo, geen start van delete/move.
- De laadtekst met tabnaam niet starten. Prompt: `contracts/futureTodo/loading-tab-progress-captain-prompt-2026-10-06.md`.
- Geen tekstsync van §1 naar `tabs-tabCrud` of `widgetBase.md`, en `futureTodo/widgetBase-cognosModelParent-futuretodo-2026-10-06.md` niet sluiten, tot delete én move geen shell meer cross-slot nemen.
- WP-P, A1, WP-Q niet op `Implemented` zetten.
- Kleurbugs blijven uitgesteld. Geen host-fouten wegslikken, geen restore-volgorde wijzigen, geen opgeslagen MDX `itemId`/`sourceId` terugschrijven.
- Geen nieuwe `.mdc`. Geen `writebackSet.restore` voor een tab-mutatie (D-CRUD-1).

## 3. Het leger

Subagents doen code lezen, code schrijven, de eerste review, en de contract-code-vergelijking.

- Onderzoek: `subagent_type: "explore"`, `model: "grok-4.7-xhigh-fast"`, `run_in_background: true`. In de prompt: READ-ONLY, geen git-writes, repo-pad, genummerde vragen, `path:line`, FACT versus INFERRED, maximale lengte.
- De slug `grok-4.7-xhigh` zit niet in de lijst. De PO koos `grok-4.7-xhigh-fast`.
- Writer: `generalPurpose`, hetzelfde model, één writer per allowlist, echo van Section A, `node --check`.
- **Meer onderzoek en review is goed. Kwaliteit boven snelheid.**
- **Context is 256k.** Grote bestanden en brede zoekacties uitbesteden. Zelf alleen het dragende fragment. Besluiten meteen in het contract (approval log). Een subagent kent dit gesprek niet.

## 4. Wat de kopie al doet (niet heropenen)

Shells blijven op het Cognos-slot. `rebuildByTabId` is wat apply schrijft. `rollbackByTabId` is de foto van vóór de mutatie. History `old.serializedByTabId` is die rollback-map.

Per doelslot mét rijen: `ensureRevealTakeTarget`, parkeren op de eigen `tabId`, `placeSerializedWidgetEntry`, `fillDuplicateWidgetContent` (die zet het `runId`). Lege bestemming die geen `fromTabId` is: niet parkeren. Pagina niet in de wrapper: structurele fout. TopN-park: `visualType: "LIST"`, `isTopNHelperClaim: true`. Vanuit `widgetBase/effects/` is het AMD-pad naar tabs `../../../tabs/...`, niet `../../tabs` (dat werd `widgets/tabs` en een RequireJS-scripterror).

D-R1: andere kind dan vis/text weigert de mutatie in prepare. TopN-helper is vrijgesteld (D-R1a). D-R2: te weinig eigen stock weigert. D-R3: widget-historie blijft op het shell-id.

Undo van een kopie is `tabs/delete` plus `widgetRebuild`. De verborgen staart wordt geparkeerd en niet gevuld. Zichtbare filters lopen via de delete-saga. Redo is een verse `tabs/duplicate`.

`runTabMutationSaga.js` markeert `degraded` ook als een widgetRebuild-delete `degradedEntries` heeft. `applyTabsDeleteHistoryReplay.js` toont dan de info-toast, alleen op die undo en op redo van een kopie. Een gewone delete-undo niet. De toast zet geen widgets terug.

Net opgeruimd, niet terugzetten: `duplicateHistorySlices` en `duplicateCreatedWidgetIds` zijn uit de saga. De exports `readHasContentState` en `widgetHasContent` op `resolveDropClaim` zijn weg. `readPadShellEligibility` blijft.

## 5. Delete, zoals het nu nog is

`handleApplyTabMutation.js`: widgets van de verwijderde slot parkeren op diezelfde `tabId`, daarna `applyDeleteSlotMoves` (zelfde shell van `fromTabId` naar `toTabId`). History bewaart `parkedWidgetIds`. Undo is `tabs/restoreDeleted` en neemt die ids terug. Dat moet naar het kopie-patroon: foto’s vóór de fysieke stap, herbouw op de eigen stock, geen cross-slot take. De reducer voor namen en zichtbaarheid en de filter-shift kunnen blijven. De verborgen staart leeg parkeren, zoals de kopie-undo.

Let op: delete-undo via history deelt `applyTabsDeleteHistoryReplay.js` met de kopie. De kopie-tak (`widgetRebuild` / `replayDuplicate`) niet breken.

## 6. Move, zoals het nu nog is

`handleApplyTabMutation.js` roept `applyMoveSnapshotFirst` aan. Zelfde shells, geen nieuwe inhoud. History bewaart alleen posities en speelt `tabs/move` opnieuw. Als apply verandert, volgt de replay vanzelf, maar de foto’s moeten in de history-stap als de inhoud op een andere shell komt (D-R3: de oude widget-historie blijft aan de shell).

## 7. Werkwijze per tranche

Zelfde poort als de kopie: read-only inventaris, delta als die nog niet dekt, execution spec met exclusive allowlist, spec-review, go, één writer, onafhankelijke review, deploylijst. `placeSerializedWidgetEntry.js` niet uitbreiden (150 regels). Nieuwe lus in een `verbNoun.js` onder de 150 regels.

Na live-groen van delete én move: tekstsync van §1, en alleen het tab-mutatie-deel van de Cognos-parent-futureTodo sluiten.
