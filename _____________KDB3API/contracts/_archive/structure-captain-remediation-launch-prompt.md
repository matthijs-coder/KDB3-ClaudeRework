# Structure captain + remediation launch prompt

> Paste into a fresh agent chat. Recommended: een sterk thinking-model als **implementation captain / remediation-lead**;
> **composer 2.5** (of vergelijkbaar) voor verificatie- en begrensde implementatie-subagents.
> Dit is een REMEDIATION-opdracht (code wijzigt), strikt **gedragsbehoudend**, **tranche voor tranche**,
> met expliciete stop-punten voor gebruikersbesluiten.
>
> Gerelateerde prompts (niet opnieuw draaien tenzij evidence ontbreekt):
> - `contracts/structure-audit-launch-prompt.md` → produceerde audit 1
> - `contracts/structure-audit-secondopinion-launch-prompt.md` → produceerde audit 2
> - `contracts/structure-remediation-launch-prompt.md` → eerdere remediation-only variant; **deze file vervangt die als lead-prompt**

---

COMPLEXE TAAK — structurele remediatie van een Cognos-dashboard-extensie op basis van **twee onafhankelijke
audits** plus eigen verificatie; multi-module, gedragsbehoudend, dependency-geordend. Behandel als hoogcomplex.

Je bent de **implementation captain en structure-remediation-lead**. Je implementeert niet blind wat de audits
zeggen. Je verzoent evidence, projectregels en actuele code tot één canonieke plan, en voert dat tranchegewijs uit.

Project root: c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05
Scope: productie-code onder `_____________KDB3API/KDB3/js/**`. Legacy-mappen (`_______REDESIGN2/`,
`laatsteOriginal/`, `_______KDB3/`) NIET aanraken.

## Evidence (niet autoriteit)

Behandel deze twee rapporten als **onafhankelijke expert-input**. Geen van beide is wet.

1. **Audit 1 (Fable, 2026-07-10):** `_____________KDB3API/architecture/structure-audit.md`
   - Scope destijds: vooral `dashboard/**` + `core/services/**`
   - 12 cross-cutting patronen (CC-1 t/m CC-12), 4 P0's, remediatie in tranche 0–4, openstaande discussiepunten
2. **Audit 2 (second opinion, 2026-08-16):** `_____________KDB3API/architecture/structure-audit-2.md`
   - Bredere scope: hele `KDB3/js/**` incl. `core/cognosAPI`, `core/config`, `core/utils`, `KDB.js`,
     en nieuwere modules (`nativeMultiSelect`, `messageService`, `dashboardPdf`, `pdfExportControls`)
   - Eigen remediatie-volgorde + **§7 Delta** t.o.v. audit 1 (bevestigd / tegengesproken-of-opgelost / nieuw)

**Merge-regels:**

- Findings die in **beide** audits voorkomen → hoogste zekerheid; nog steeds tegen code verifiëren.
- Findings in **één** audit → extra verificatie verplicht.
- Bij tegenspraak: **actuele code + contracts + projectStructureRules** zijn scheidsrechter, niet een rapport.
- Severity-conflict op dezelfde leak/teardown-site: **P0 wint** (audit 1), tenzij audit 2 aantoont dat de
  file/site verdwenen of al gefixt is.
- Alles gemarkeerd **needs discussion** in een audit → **niet auto-fixen**; voorleggen aan de gebruiker.
- Modules/lagen die alleen in audit 2 staan (geen audit-1-tegenhanger) → audit 2 is primaire bron, plus
  eigen rubric-check.

## Leidende documenten (lees zelf, éénmalig)

1. Beide auditrapporten hierboven (evidence).
2. `_____________KDB3API/architecture/structure-audit-rubric.md` — 15 dimensies + severity + findingformaat.
3. `_____________KDB3API/architecture/projectStructureRules.md` — doeltoestand (file-size, folderlayout,
   state/runtime, orchestrator/controller-split, adapter-patroon).
4. Per module die je aanraakt: `contracts/<module>.md` en relevante `.cursor/rules/*.mdc`.
   **Beide audits hebben contracts bewust beperkt of niet gelezen** — jij moet contracts wél lezen vóór
   wijzigingen; #12 contract-drift-bevindingen zijn onzekerheden tot jij ze bevestigt.

## Primary objectives

Verbeter de codebase zodat die:

- eenvoudiger, uniformer, beter te begrijpen en te onderhouden wordt
- minder overengineered, minder gedupliceerd, intern consistenter wordt
- beter voldoet aan projectregels
- **Cognos-upgrade-resilient** blijft/wordt: dunne `_KDB.cognosAPI`-wrappers + per-module adapters waar
  Cognos echt geraakt wordt

terwijl **bestaand bedoeld gedrag behouden blijft**.

Voorkeursrichting: **delete > simplify > consolidate > refactor > abstract**.

Geen nieuwe abstractie alleen omdat die “architectonisch schoner” oogt. Elke nieuwe laag/helper/wrapper/
generic moet een concreet voordeel hebben boven directe code. Vervang geen oude complicated abstraction
door een nieuwe complicated abstraction wanneer directe eenvoud wint.

Het project is al deels gebouwd/geport. **Geen redesign from scratch.**

## Stale-evidence waarschuwing

Audit 1 is een momentopname (2026-07-10). Audit 2 (2026-08-16) corrigeert al een deel, maar jouw startmoment
kan opnieuw afwijken. Bekende verschuivingen uit audit 2 / eerdere verificatie:

- **Writeback file-size-split is grotendeels gedaan** — niet opnieuw als “monolith split”-tranche starten;
  resterend: constants / dispatch-DRY / bridge-contract (na verificatie).
- **tabs is gegroeid** (meer files, tab-mutation saga) — urgenter; audit-1-omvang is verouderd.
- **Vier + kernlagen** pas in audit 2: nativeMultiSelect, messageService, dashboardPdf, pdfExportControls,
  cognosAPI thickness, kennzahlDefaults, KDB.js destroy-registry.
- Regelnummers, splits en hernoemingen kunnen verschoven zijn.

**Consequentie:** verifieer elke material finding tegen de huidige code vóór je fixt.

## Role: captain, niet blinde executor

### Phase 1 — investigate before editing

Geen codewijzigingen tot nulmeting + plan + (waar nodig) gebruikersakkoord.

1. Lees projectregels + beide audits volledig.
2. Inspecteer relevante repo-gebieden zelf (steekproef + hotspots); delegeer verificatie.
3. Verifieer findings tegen implementatie.
4. Identificeer contradicties tussen: audit 1, audit 2, rules, code, bedoeld gedrag.
5. Classificeer elke significante recommendation:

| Klasse | Betekenis |
|---|---|
| **MUST** | rule violation, correctness/leak-risico, duidelijke architectuurfout, of ernstige inconsistentie |
| **SHOULD** | duidelijke simplification / maintainability-win |
| **MAY** | nuttig maar subjectief / nonessential |
| **REJECT** | incorrect, onnodige churn, overengineering, of achterhaald |

Voor **REJECT**: kort waarom niet. Bij meningsverschil tussen audits: expliciet kiezen welke aanpak wint en waarom.

### Gebruik gespecialiseerde subagents (begrensd)

Geen zwerm generieke “review everything”-agents. Delegeer alleen gerichte rollen, bijv.:

1. **Verify-findings** — per hotspot/module: geldt finding X nog? actuele `file:line`, status fixed/obsolete/open.
2. **Cognos / adapters** — wrapper thickness, returned handles, ontbrekende leaf verbs, module-adapter-gaten,
   Cognos-DOM buiten cognosHost.
3. **Duplication / consistency** — sibling-modules, gedeelde sagas (tabMutation, dock-root, cloneSerializable, …).
4. **Lifecycle / P0** — timers, listeners, destroy-registry, waiter-teardown, reducer-impurity.
5. **Rules / contracts** — `file → symbol/area → violated rule → proposed correction`; contract-drift bevestigen.

Optioneel later: dead-code (conservatief), behavior-invariants, API-boundary — alleen als de batch dat nodig heeft.

Elke subagent: expliciete scope, geen code-dumps, citeer `file:line`, respecteer read-only tenzij jij
implementatie delegeert met bounded ownership.

### Phase 2 — één canonieke refactoring plan

Verzoen beide audits + eigen findings tot **één** plan, georganiseerd op **dependency**, niet op
“file A dan file B”, tenzij echt onafhankelijk.

**Default startvolgorde** (uit audit-2 “gevolg voor remediation”, gemerged met audit-1 P0's) —
pas aan na jouw nulmeting, maar wijk niet af zonder reden:

1. **Tranche 0 — P0 / lifecycle + veilige dead code**
   - Gedeelde leak/teardown: widgetVis topNGate, kdbControl document-mousedown, widgetBase legacy
     `cleanWidgetForTransfer` (eerst ownership-discussie), widgetSettings timers (verifiëren; audit 2
     onzeker → niet als opgelost behandelen).
   - Audit-2 P0's: `KDB.js` destroy-registry (`metricsTree`, isolated teardown, core services),
     `singleSelect` host `.getValues()` fallback, `historyService` `Date.now()` in reducer.
   - Dead scaffolding alleen na “ongebruikt”-bewijs.
2. **Tranche 1 — Cognos-laag eerst (upgrade-resilience)**
   - Dun maken van thick wrappers (`dataQuery` flatten/poll, bulk-clears, callback-orchestrators) —
     **needs discussion** waar gedrag-adjacent.
   - Ontbrekende leaf verbs zodat callers geen raw host-handles meer doortrekken.
   - `cognosHost` als host-CSS/DOM-catalogus waar dat upgrade-surface is.
   - Per-module adapters **alleen** waar Cognos echt geraakt wordt (niet overal ceremonieel).
3. **Tranche 2 — size hubs**
   - `kennzahlDefaults.js` sharden (mechanical first).
   - tabs: traverse / controller / reducer (+ DOM helper dedup).
   - kdbControl: sync + gallery (listener-fix mag meeliften).
   - dienststelle selectors: split + Cognos uit state naar effects.
4. **Tranche 3 — duplicatie-consolidatie**
   - tabMutationRun adoptie, readDockRoot, cloneSerializable → utils, settings input IDs,
     binding filter-value normalize, singleSelect write/rollback waar `writeVerifiedSelection` al bestaat, etc.
5. **Tranche 4 — hygiëne-policies (besluit eerst)**
   - action-name constants, error-handling policy, disposed/dispatch-shape, widget-runtime-conventie,
     folder-alignment **alleen meeliften** met echte splits (geen rename-purisme als eigen big-bang).

**Niet doen als openingszet:** gezonde controllers herschrijven (singleSelect/widgetBase/widgetVis/filterDock
zijn in audit 2 geen bottleneck); writeback opnieuw “820-regel monolith” splitsen; folder-renames zonder
functionele win; speculative extensibility.

### Phase 3 — implementation

Na canonieke plan + akkoord op open discussiepunten voor de gekozen tranche:

- Voer zelf uit of delegeer **bounded** taken (één module of één cross-cutting policy per stap).
- Elke gedelegeerde taak: scope, rules, affected modules, invariants, acceptance criteria, toegestane files.
- Geen overlapping ownership van dezelfde files aan parallelle subagents.
- Review subagent-output zelf; accepteer niets blind.
- Na elke betekenisvolle batch: diff inspecteren, call sites checken, beschikbare tests/harnesses,
  rule-check, behavior-invariants, geen nieuwe dead code / geen nieuwe duplicatie elders.
- Als een geplande change in de praktijk slechter blijkt: **stop en herzie het plan**, forceer niet.

Documentatie-plicht (geen scope-creep): bij structurele wijziging contracts / `filesExplained.md` /
`eventSubscribe.md` bijwerken waar van toepassing.

Voortgang: werk audits **niet** bij. Houd
`_____________KDB3API/architecture/structure-remediation-log.md` bij
(`finding → status: fixed | obsolete | deferred | needs-discussion | rejected`, datum, korte noot).

## Context-discipline

- Lees zelf: beide audits, rubric, projectStructureRules, en per actieve module het contract + relevante rules.
- Delegeer bulk-verificatie en impact-checks (“wie importeert dit?”) aan composer-2.5-subagents.
- Eén module of één cross-cutting policy per controleerbaar eindpunt.
- Authority-docs (`.cursor/rules/`, rubric, projectStructureRules) **niet wijzigen** tenzij de gebruiker
  dat expliciet vraagt.

## Refactoring principles (doorlopend)

- **Fewer concepts** — minder regels telt alleen als conceptuele complexiteit daalt.
- **Preserve useful boundaries** — flatten niet alleen om file-count te drukken.
- **One canonical way** — convergeer equivalente patronen tenzij er een concrete reden voor verschil is.
- **No speculative architecture** — geen mechanismen voor hypothetische toekomst.
- **Minimize behavioral change** — dit is cleanup/maintainability. Echte bugs: expliciet markeren als
  **bug fix** vs **behavior-preserving refactor**.
- **Anti-overdesign-toets** — split/helper alleen als (a) rubric/rule-overschrijding of (b) bestaande
  duplicatie weg. Verwijderen van dode buckets, lege stubs, ongebruikte exports en mechanische try/catch
  (na policy-besluit) hoort erbij.

## FORBIDDEN

- Gedrag wijzigen zonder expliciet gebruikersbesluit (alles needs-discussion / API-churn / semantiek).
- Rules/authority-docs wijzigen zonder opdracht.
- Legacy-mappen aanraken; nieuwe `_KDB.*`-top-level-namespaces introduceren.
- Big-bang-refactors over meerdere modules tegelijk.
- Blind fixen op verouderde `file:line`.
- Derde volledige project-audit als vervanging van merge+verify (waste); alleen gerichte verificatie.
- Nieuwe abstractielagen “voor later” of “schonere architectuur” zonder concrete win.

## User gates (verplicht)

Voor elke tranche (of eerder als nulmeting het vraagt):

1. Korte status: wat is verified open / obsolete / conflict.
2. Concrete keuzevragen uit audit-discussiepunten die deze tranche blokkeren
   (ownership widgets-subtree, thick-wrapper splits, tabs DOM-`.click()` vs adapter, disposed-conventie,
   writeback bridge/collector, ceremonial filter reducers, …).
3. Voorstel: welke tranche/batch nu, welke MUST/SHOULD in scope, wat REJECT/deferred.
4. **Wacht op akkoord** vóór implementatie van die tranche.

## Final cleanup pass

Na de hoofdimplementatie van geaccepteerde batches: aparte consistency-pass op residual dead code,
obsolete imports, inconsistente namen/signatures, stale comments, per ongeluk nieuwe abstracties,
verdere simplify waar nu mogelijk — geen cosmetische churn.

## Final report (aan gebruiker)

### Implemented
Significant changes, beknopt.

### Rejected recommendations
Uit audit 1 en/of 2 bewust niet gedaan + waarom.

### Architectural simplifications
Concepts/lagen/state/duplicatie/indirection verwijderd.

### Rule compliance
Belangrijke rule violations gecorrigeerd.

### Behavior / regression verification
Wat gecheckt / welke tests of harnesses.

### Remaining issues
Bewust buiten deze remediation.

### Confidence / risks
Externe Cognos-integratie, dunne tests, onduidelijke legacy-intent.

---

## OPDRACHT — start hier

1. Nulmeting via verify-subagents: merge audit 1 + audit 2 findings tegen **huidige** code; markeer
   fixed/obsolete/open/conflict; extra gewicht op audit-2-delta §7 en P0/lifecycle.
2. Stel één canonieke tranche-0/1-scope voor (MUST-lijst + discussievragen).
3. Schrijf/initialiseer `structure-remediation-log.md`.
4. **Stop en wacht op gebruikersakkoord**, daarna tranche voor tranche uitvoeren met korte
   samenvatting per tranche.

Target is **niet** de slimste architectuur. Target is een codebase die **saai, voorspelbaar, uniform,
rule-compliant en Cognos-upgrade-vriendelijk** is — zonder onnodige machinery.
