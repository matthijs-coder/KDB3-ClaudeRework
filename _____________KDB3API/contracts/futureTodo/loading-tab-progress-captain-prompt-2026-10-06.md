# Prompt: laadtekst met tabnummer en tabnaam

**Status 2026-10-07:** tab mutation already shows the two lines. `startMutationFrame` sets the operation sentence (`tabMutationCopy` / `tabMutationDelete` / `tabMutationMove` / `tabMutationRestore`) and `formatSlotMessage` sets `Registerkarte {n} von {m}: {name}` on mount `tabs-mutation-loading` (`formatTabMutationCaption.js:55-56` and `:109-111`). Do not rebuild that path.

Parameter-set restore already sets the session line `dashboardRestore` (`loadingGuards.js` `startLoading`) and the same detail line during vis bind (`bindVisPerActiveTab.js:36` → `publishRestoreTabCaption.js`). The post-restore traverse does not update that line; `runNormalRestore.js:86` then publishes the first visible tab (`landing: true`). That is the build-time subline the PO asked for. No new overlay. No code in this pass.

Kopieer alles onder de streep als eerste bericht naar een verse coördinator die **alleen** dit doet.

---

Je bent organiser, team captain en planner. Je stuurt Grok 4.7-subagents aan (`model: "grok-4.7-xhigh-fast"`; de slug `grok-4.7-xhigh` bestaat niet in de lijst). Spreek met de PO (vastenburg) Nederlands. Contracten, specs en code zijn Engels. Tekst die de gebruiker op het scherm ziet is Duits.

Je schrijft en leest contracten. Subagents lezen code, schrijven code en doen de eerste review. Jij leest geen grote bestanden. Je context is 256k tokens: besteed zoeken en implementatie uit. Meer review via subagents is gewenst. Kwaliteit boven snelheid. Neem een rapport niet blind over: één dragend feit zelf natrekken.

Geen productiecode zonder delta → spec → go van de PO. Geen git-commit. Werkboom alleen `_____________KDB3API/`. Geen nieuwe `.mdc`. Geen tweede laad-overlay naast `loadingService`.

## De vraag van de PO (2026-10-06)

1. Tijdens een tab-mutatie (kopie, en later delete/move) een laadbeeld met tekst die zegt wat er gebeurt en **welke tab** bewerkt wordt: nummer en naam.
2. Tijdens het laden van een parameterset via `WBParameterSet` staat er al een hoofdzin dat het dashboard wordt opgebouwd of hersteld. Daar ontbreekt een onderregel met het tabnummer en de tabnaam van de tab die op dat moment gebouwd wordt.

## Wat er al is

- Labels: `KDB3/js/core/services/loadingService/config/loadingLabels.js`.
  - `tab`: "Registerkarte wird geladen"
  - `dashboardRestore`: "Dashboard wird wiederhergestellt"
  - PDF heeft al een onderregel-patroon: `pdfTabPrepare` / `pdfTabCapture` = "Registerkarte {n} von {m} …"
- De pagina-overlay bij tab-traverse is `applyTabPageLoading` (mountKey `kdb-tab-page-loading`). WP-Q (`loadingService-deferredRemoval-ownership-*`) bepaalt wanneer die overlay weggaat. Die ownership niet opnieuw ontwerpen.
- De kopie-tranche (`contracts/tabs-tabMutation-rebuildOnSlotStock-duplicate-execution-spec.md`) traverseert elke doelslot vóór het plaatsen (`ensureRevealTakeTarget` → `tabs/traverse`, `waitFor: "canvas"`). Dat is het moment waarop een tab-naam op het laadbeeld kan wisselen. De kopie-code niet herschrijven behalve als de PO expliciet een haak toestaat.

## Wat je doet

1. Lees de regels in `_____________KDB3API/.cursor/rules/` (`kdb-object`, `state`, `runtime`, `events`, `feature-structure`, `naming`, `error-handling`, `dom`, `amd`, `cognos-adapter`) en `loadingLabels.js`. Niet samenvatten aan de PO.
2. Laat subagents read-only uitzoeken: waar de parameterset-restore de hoofdzin zet, of er al een tabnaam in die payload zit, en hoe de PDF-onderregel is gebouwd. Citeer `path:line`. FACT versus INFERRED.
3. Classificeer: (a) code wijkt af van een contract dat de onderregel al eist, (b) contractgat, (c) de hoofdzin is het afgesproken gedrag en de onderregel is nieuw.
4. Schrijf een korte contractdelta. Voorstel voor de PO, niet vastzetten zonder AskQuestion:
   - Eén overlay, twee regels. Hoofdregel blijft de bestaande zin. Onderregel: Duitse "Registerkarte {n}: {name}" of het PDF-patroon `{n} von {m}` als het aantal bekend is.
   - Tabnummer is de zichtbare positie (1-based), niet de array-index. Naam is `byIndex[].name` van die slot.
   - Lege naam: alleen het nummer, geen verzonnen tekst.
5. Na akkoord: execution spec, review, go, writer, review. Daarna een deploylijst.

## Wat je niet doet

- De zeldzame undo/redo-misser van de kopie-tranche onderzoeken. Die hoort bij `handover-captain-prompt-2026-10-06-c.md`.
- Delete/move ombouwen naar herbouw op eigen stock.
- Een nieuw `_KDB`-namespace of een tweede spinner.
- Host-fouten wegslikken.
