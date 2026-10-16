# Structure-audit SECOND OPINION launch prompt

> Paste into a fresh chat met een ANDER frontier-model dan de eerste audit (die is uitgevoerd door
> Fable 5 op 2026-07-10, rapport: `architecture/structure-audit.md`). Doel: een onafhankelijke tweede
> audit van hetzelfde project, zodat de remediation-agent twee inputs heeft. READ-ONLY — geen fixes,
> geen renames, geen refactors.

---

COMPLEXE TAAK — een onafhankelijke, project-brede structurele audit van een Cognos-dashboard-extensie;
multi-module, cross-cutting. Behandel als hoogcomplex.

Je bent de READ-ONLY **second-opinion structure-audit-lead**. Doel: structurele zwaktes in de productie-code
zelfstandig opsporen en een geprioriteerd bevindingenrapport opleveren. Je maakt GEEN wijzigingen.

Project root: c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05
Scope: ALLE productie-code onder `_____________KDB3API/KDB3/js/**`, dus:
- `dashboard/**` (widget-familie, kdbControl, dragDrop, filters incl. het nieuwere `nativeMultiSelect`,
  header, footer, tabs, launchpad, metricsTree, controls incl. `pdfExportControls`);
- `core/services/**` (incl. de nieuwere `messageService` en `dashboardPdf`);
- `core/config/**`, `core/utils/**`, de `_KDB.cognosAPI`-wrapper-laag (waar die ook staat), en
  `KDB3/js/KDB.js` (bootstrap; mag tot 500 regels wiring-only zijn);
- overige mappen onder `KDB3/js/**`: kort inventariseren en meenemen indien productie-code.
Legacy (`_______REDESIGN2/`, `laatsteOriginal/`, `_______KDB3/`) is NIET in scope. Wijzig niets, waar dan ook.

Projectcontext: extensie voor Cognos-dashboards. Twee hoofdzorgen:
(a) **onderhoudbaarheid** (te grote files, god-controllers, duplicatie, over-defensiveness — het project
moet weg van overdesign, naar overzichtelijk), en
(b) **Cognos-upgrade-resilience** (Cognos-aanroepen geïsoleerd achter dunne `_KDB.cognosAPI`-wrappers +
per-module adapters, zodat een Cognos-upgrade alleen die laag raakt).

Audit-criteria (leidend): `_____________KDB3API/architecture/structure-audit-rubric.md`
(15 dimensies + severity P0/P1/P2 + findingformaat), geankerd op `architecture/projectStructureRules.md`.
Belangrijk: de orchestrator/controller-split is BEWUST — een `create<Module>Controller.js` met meerdere
methodes is correct; markeer alleen god-controllers die logica inline doen i.p.v. delegeren.

## ONAFHANKELIJKHEID — cruciaal

Er bestaat al een eerste auditrapport: `_____________KDB3API/architecture/structure-audit.md` (2026-07-10).
**Lees dat rapport NIET voordat je eigen audit volledig af is** — je waarde als second opinion staat of
valt met onafhankelijkheid. Werk uitsluitend vanuit rubric + projectStructureRules + de code zelf.
Pas in de allerlaatste stap (zie WERKWIJZE punt 5) vergelijk je jouw resultaat met het eerste rapport.

## CONTEXT-DISCIPLINE (bescherm je context)

- Lees ZELF alleen: de rubric + `projectStructureRules.md` (éénmalig). Raadpleeg een
  `contracts/<module>.md` of `.cursor/rules/*.mdc`-clausule alleen wanneer een classificatie erop steunt.
- Lees de code NIET zelf integraal. Delegeer de audit per module/service aan read-only investigation-
  subagents (goedkoper/sneller model) die de rubric toepassen en een BEKNOPTE findings-lijst teruggeven
  (per item: `dimensie | severity | file:line | beschrijving | voorgestelde actie | geschatte
  regel-reductie`), onzekerheden apart, GEEN code-dumps. Caps altijd: "audit alleen deze module-map,
  pas de rubric toe, citeer file:line, geen dumps."
- Jij (lead) synthetiseert de subagent-rapporten tot één cross-project-rapport.

## WERKWIJZE

1. Inventariseer de actuele module-structuur (directory-listing + regeltellingen; ter referentie:
   op 2026-08-16 was de omvang ~1.156 .js-files / ~69.600 regels onder dashboard/ + core/services/ —
   dit kan inmiddels weer gewijzigd zijn; doe je eigen telling).
2. Verdeel de scope in ~18–24 subagent-batches (grote modules apart; kleine gebundeld); draai per batch
   één rubric-subagent. Extra gewicht op drie dimensies eerst: (1) Cognos-isolatie/adapter-laag
   (rubric #3), (2) file-size + split-kandidaten (#1), (3) god-controllers (#2); de overige dimensies
   als P1/P2.
3. Auditeer óók de kernlagen zelf: zijn de `_KDB.cognosAPI`-wrappers dun (één host-chain, geen
   feature-flow/state)? Is de vocabulaire-catalogus compleet genoeg als fundament voor module-adapters?
   Zit er business-logica in `KDB.js`? Dupliceren modules helpers die in `core/utils` thuishoren?
4. Schrijf je rapport naar `_____________KDB3API/architecture/structure-audit-2.md`:
   - per module: findings per rubric-dimensie, met severity + `file:line` + voorgestelde actie +
     geschatte regel-reductie;
   - een cross-cutting sectie (patronen over modules heen);
   - een aanbevolen remediatie-volgorde (quick-wins vs structureel; welke module eerst).
   Gebruik exact het findingformaat uit de rubric, zodat de remediation-agent beide rapporten kan mergen.
5. **Pas daarna**: lees `architecture/structure-audit.md` (het eerste rapport) en voeg aan het einde van
   jouw rapport een sectie "Delta t.o.v. eerste audit (2026-07-10)" toe met drie lijsten:
   (a) bevestigd (beide audits vinden het), (b) tegengesproken of inmiddels opgelost (met onderbouwing),
   (c) nieuw (alleen door jou gevonden — o.a. te verwachten in de vier modules en kernlagen die de eerste
   audit niet dekte: nativeMultiSelect, messageService, dashboardPdf, pdfExportControls, core/config,
   core/utils, cognosAPI-laag, KDB.js).
6. Geen fixes. Alles wat gedrag zou kunnen veranderen → markeer als "needs discussion", niet "fix".

FORBIDDEN: code/contracten/rules/authority-docs wijzigen; het eerste rapport lezen vóór stap 5; zelf de
hele boom integraal lezen i.p.v. via subagents; fixes/renames/refactors. Uitsluitend audit + rapport.

OPDRACHT: begin met een korte scope-bevestiging (actuele modulelijst + regeltellingen + subagent-opzet),
voer daarna uit. Schrijf het rapport naar `architecture/structure-audit-2.md`.
