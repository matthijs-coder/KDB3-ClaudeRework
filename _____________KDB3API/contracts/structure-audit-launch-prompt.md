# Structure-audit launch prompt (fable 5)

> Paste into a fresh audit-agent chat. Recommended model: `claude-fable-5-thinking-high` for the lead; cheaper/faster models for the per-module investigation subagents. This is a READ-ONLY audit that produces a report — it makes no code changes.

---

COMPLEXE TAAK — een project-brede structurele audit van een Cognos-dashboard-extensie tegen de
projectregels; multi-module, cross-cutting, met zorgvuldige prioritering. Behandel als hoogcomplex.

Je bent de READ-ONLY **structure-audit-lead**. Doel: structurele zwaktes in de productie-code opsporen en
een **geprioriteerd bevindingenrapport** opleveren. Je maakt GEEN wijzigingen — geen fixes, geen renames,
geen refactors. Fixes gebeuren later per module in aparte tranches.

Project root: c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05
Scope: productie-code onder `_____________KDB3API/KDB3/js/**`. Legacy (`_______REDESIGN2/`, `laatsteOriginal/`,
`_______KDB3/`) is NIET in scope. Wijzig niets, waar dan ook.

Projectcontext: dit is een extensie voor Cognos-dashboards. Twee hoofdzorgen sturen de audit:
(a) **onderhoudbaarheid** (te grote/gebloatte files, god-controllers, duplicatie, over-defensiveness), en
(b) **Cognos-upgrade-resilience** (Cognos-aanroepen moeten geïsoleerd zijn achter een dunne wrapper/adapter-
laag zodat een Cognos-upgrade alleen die laag raakt).

Audit-criteria (leidend): `_____________KDB3API/architecture/structure-audit-rubric.md`
(15 dimensies + severity P0/P1/P2 + findingformaat), geankerd op `architecture/projectStructureRules.md`
en de 10 MUST-rules. Belangrijk: de orchestrator/controller-split is BEWUST — een `create<Module>Controller.js`
met meerdere methodes is correct; markeer alleen **god-controllers** die logica inline doen i.p.v. te
delegeren naar benoemde helpers, niet het bestaan van de controller.

CONTEXT-DISCIPLINE (bescherm je context):
- Lees ZELF alleen: de rubric + `projectStructureRules.md` (criteria, één keer). Raadpleeg een losse
  `.cursor/rules/<rule>.mdc`-clausule of een `contracts/<module>.md` alleen wanneer een bevinding-classificatie
  daarop steunt.
- Lees de code NIET zelf integraal. Delegeer de audit **per module/service** aan read-only investigation-
  subagents die de rubric toepassen en een BEKNOPTE findings-lijst teruggeven (per item:
  `dimensie | severity | file:line | beschrijving | voorgestelde actie | geschatte regel-reductie`),
  onzekerheden apart, GEEN code-dumps. Caps altijd: "audit alleen deze module-map, pas de rubric toe,
  citeer file:line, geen dumps."
- Jij (lead) SYNTHETISEERT de subagent-rapporten tot één cross-project-rapport. Zo blijft je context vrij.

WERKWIJZE:
1. Bepaal met mij (of uit mijn opdracht) de te auditen modules/services (of "alles onder KDB3/js").
2. Draai per module/service één rubric-subagent (goedkoper model). Verzamel de findings.
3. Schrijf het rapport naar `_____________KDB3API/architecture/structure-audit.md`:
   - per module: findings gegroepeerd per rubric-dimensie, met severity + `file:line` + voorgestelde actie
     + geschatte regel-reductie;
   - een cross-cutting sectie (patronen die over modules heen terugkomen, bv. Cognos-calls buiten de
     wrapper/adapter-laag, herhaalde over-defensiveness);
   - een aanbevolen **remediation-volgorde** (quick-wins vs structureel; welke module eerst).
4. Geen fixes. Alles wat gedrag zou kunnen veranderen → markeer als "needs discussion", niet "fix".

FORBIDDEN: code/contracten/rules/authority-docs wijzigen; zelf de hele boom integraal lezen i.p.v. via
subagents; fixes/renames/refactors uitvoeren. Dit is uitsluitend een audit + rapport.

OPDRACHT:
<<vul in: welke modules/services auditen (of "alles onder KDB3/js"); eventueel welke dimensies extra
gewicht krijgen (bv. Cognos-isolatie + file-size + god-controllers eerst)>>
```
