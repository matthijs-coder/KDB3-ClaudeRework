# Structure-remediation launch prompt

> **Superseded as lead prompt** by `contracts/structure-captain-remediation-launch-prompt.md`
> (captain + remediation, met audit 1 én 2 als evidence). Deze file blijft als eerdere remediation-only
> variant / referentie.
>
> Paste into a fresh agent chat. Recommended model: een sterk thinking-model als lead; **composer 2.5**
> voor verificatie- en mechanische subagents. Dit is een REMEDIATION-opdracht (er wordt code gewijzigd),
> maar strikt **gedragsbehoudend** en **tranche voor tranche**, met verificatie vooraf.

---

COMPLEXE TAAK — structurele remediatie van een Cognos-dashboard-extensie op basis van een bestaand
auditrapport; multi-module, gedragsbehoudend, met expliciete stop-punten voor gebruikersbesluiten.
Behandel als hoogcomplex.

Je bent de **structure-remediation-lead**. Doel: het project solide, consistent en onderhoudbaar maken —
**weg van overdesign, naar overzichtelijk** — door de bevindingen uit het structuur-auditrapport
gecontroleerd weg te werken. Geen nieuwe features, geen nieuwe abstractielagen buiten wat de projectregels
voorschrijven, geen "verbeteringen" die gedrag wijzigen.

Project root: c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05
Scope: productie-code onder `_____________KDB3API/KDB3/js/**`. Legacy-mappen (`_______REDESIGN2/`,
`laatsteOriginal/`, `_______KDB3/`) NIET aanraken.

## Leidende documenten (lees deze zelf, éénmalig)

1. `_____________KDB3API/architecture/structure-audit.md` — het auditrapport (2026-07-10): per module
   findings (`dimensie | severity | file:line | actie | regel-reductie`), 12 cross-cutting patronen (CC-1
   t/m CC-12), en een remediatie-volgorde in 5 tranches (tranche 0 t/m 4) inclusief een lijst
   **openstaande discussiepunten**. Dit rapport is je werklijst.
2. **Indien aanwezig:** `_____________KDB3API/architecture/structure-audit-2.md` — een onafhankelijke
   second-opinion-audit door een ander model (zelfde rubric en findingformaat, incl. een delta-sectie
   t.o.v. het eerste rapport). Gebruik beide rapporten als input: findings die in beide voorkomen hebben
   de hoogste zekerheid; findings uit één rapport verifieer je extra tegen de code; bij tegenspraak is
   **de huidige code de scheidsrechter**, niet een van de rapporten. Neem beide werklijsten mee in je
   nulmeting en voortgangslog. Bestaat het bestand niet, werk dan alleen met het eerste rapport.
3. `_____________KDB3API/architecture/structure-audit-rubric.md` — de criteria (15 dimensies, severity).
4. `_____________KDB3API/architecture/projectStructureRules.md` — de doeltoestand (file-size-limieten,
   folderlayout, state/runtime-regels, orchestrator/controller-split, adapter-patroon).
5. Per module die je aanraakt: het bijbehorende `contracts/<module>.md` en relevante
   `.cursor/rules/*.mdc`-clausules. **De audit heeft de contracts bewust NIET gelezen** — jij moet dat
   per module wél doen vóór je er iets wijzigt; alle #12-bevindingen (contract drift) in het rapport zijn
   onzekerheden, geen vaststellingen.

## BELANGRIJK — het rapport is een momentopname (2026-07-10); de code is sindsdien gewijzigd

Een verificatie-pass op 2026-08-16 stelde vast:

- **Alle 4 P0's stonden toen nog open** (exacte ankers in rapport §0):
  P0-1 widgetSettings setTimeout-leaks (`bindWidgetSettingsPanel.js:100,147`);
  P0-2 widgetVis topNGate-teardown ontbreekt in `runtime/cleanupRuntime.js`;
  P0-3 widgetBase legacy state-write in `effects/cleanWidgetForTransfer.js:42-47`;
  P0-4 kdbControl document-mousedown-listener zonder teardown (`buildControlPrimitiveGallery.js:242-258`).
- **writeback is inmiddels grotendeels gesplitst** (set-service 820→89, validateV3 422→48,
  normalizeV3 332→85; logica naar `set/effects|state|config` en `schema/validate|normalize/*`).
  Tranche-1-punt 6 uit het rapport is dus deels/geheel gedaan — verifieer de nieuwe structuur tegen de
  rubric i.p.v. het blind opnieuw te doen, en check of de twee writeback-contract-mismatches
  (ongewirede collector; v2-bridge→map "not implemented") inmiddels opgelost zijn.
- **tabs is verder gegroeid** (controller 289→318, reducer 294→316, traverseTabs 323→329) — de
  tabs-bevindingen zijn urgenter geworden, en er kan nieuwe code zijn die het rapport niet kent.
- **Vier nieuwe modules bestaan die NOOIT geauditeerd zijn:** `dashboard/filters/nativeMultiSelect`,
  `core/services/messageService`, `core/services/dashboardPdf`, `dashboard/controls/pdfExportControls`.
- **Het project groeide van ~840 files / ~48.700 regels naar ~1.156 files / ~69.600 regels.**

Consequentie: **verifieer elke finding tegen de huidige code voordat je hem fixt.** Regelnummers kunnen
verschoven zijn, files kunnen gesplitst/hernoemd zijn, en sommige findings kunnen al opgelost of juist
verergerd zijn. Ook deze verificatie-cijfers van 2026-08-16 kunnen op jouw startmoment alweer verouderd
zijn — draai je eigen nulmeting.

## CONTEXT-DISCIPLINE (bescherm je context)

- Lees zelf alleen: het rapport, de rubric, projectStructureRules, en per actieve module het contract.
- Delegeer aan **composer 2.5 subagents** (read-only): (a) de nulmeting/verificatie per module
  ("welke van deze findings gelden nog, met actuele file:line en regelaantallen"), (b) mini-audits van de
  vier nieuwe modules volgens de rubric (zelfde findingformaat als het rapport), (c) impact-checks vóór
  een split ("wie importeert deze file / dit symbool").
- Voer de code-wijzigingen zelf uit of via subagents per module — maar altijd één module (of één
  cross-cutting policy) per tranche-stap, met een controleerbaar eindpunt.
- Werk het rapport (`structure-audit.md`) NIET bij; houd in plaats daarvan een beknopte voortgangslijst
  bij in `_____________KDB3API/architecture/structure-remediation-log.md` (finding → status:
  fixed/obsolete/deferred/needs-discussion, met datum).

## WERKWIJZE

1. **Nulmeting.** Draai per te behandelen module een composer 2.5-verificatie-subagent die de
   rapport-findings tegen de huidige code legt. Behandel de vier nieuwe modules met een rubric-mini-audit
   (zelfde formaat). Rapporteer de delta kort aan de gebruiker.
2. **Discussiepunten eerst.** Het rapport eindigt met "Openstaande discussiepunten" — leg die (voor zover
   relevant voor de gekozen tranche) als concrete keuzevragen aan de gebruiker voor vóórdat je de
   betreffende fixes uitvoert. Fix nooit iets dat als "needs discussion" gemarkeerd is zonder besluit.
3. **Tranche-volgorde uit het rapport aanhouden**, met deze correcties op basis van de verificatie:
   - Tranche 0 (P0's + dead code) is onverminderd eerste prioriteit.
   - Tranche 1: writeback waarschijnlijk al gedaan (alleen valideren); **tabs** en **kdbControl** zijn de
     resterende hotspots, tabs eerst (groeit door).
   - Voeg aan tranche 0/1 toe: mini-audit + eventuele quick-fixes van de vier nieuwe modules, zodat ze
     niet dezelfde schuld opbouwen.
   - Tranches 2–4 (adapter-rollout, dedup, policies) zoals in het rapport.
4. **Per fix:** gedragsbehoudend, kleinste zinvolle stap, conform projectStructureRules (file-size,
   folderlayout, AMD, naming). Na elke module: lints/harnesses draaien indien beschikbaar; contract en
   `filesExplained.md`/`eventSubscribe.md` bijwerken als de structuur wijzigt (dat is documentatie-plicht,
   geen scope-creep).
5. **Anti-overdesign-toets bij elke stap:** een split of helper is alleen gerechtvaardigd als hij (a) een
   rubric-overschrijding oplost of (b) bestaande duplicatie verwijdert. Geen speculatieve abstracties,
   geen extra lagen, geen "voor later". Het verwijderen van mechanische try/catch, dode buckets, lege
   stubs en ongebruikte exports is expliciet onderdeel van de opdracht (CC-3B, CC-6, dead code in
   tranche 0) — minder code is het doel, niet meer structuur.

## FORBIDDEN

- Gedrag wijzigen zonder expliciet gebruikersbesluit (alles "needs discussion" in het rapport).
- Rules/authority-docs (`.cursor/rules/`, rubric, projectStructureRules) wijzigen.
- Legacy-mappen aanraken; nieuwe `_KDB.*`-top-level-namespaces introduceren.
- Grote big-bang-refactors over meerdere modules tegelijk; werk per module af tot een groen, gedocumenteerd
  eindpunt.
- Blind fixen op verouderde regelnummers — altijd eerst verifiëren.

## AANVULLENDE SCOPE — nooit-geauditeerde kernlagen

Het auditrapport dekte alleen `dashboard/**` en `core/services/**`. De volgende lagen zijn NOOIT geauditeerd
en moeten door jou (via composer 2.5 rubric-subagents, zelfde findingformaat) alsnog worden meegenomen:

- `KDB3/js/core/config/**` en `KDB3/js/core/utils/**` — gedeelde config en helpers; let op duplicatie met
  module-lokale kopieën (rapport CC-5) en verboden legacy-namespaces (`_KDB.utilities` wordt nog gebruikt
  vanuit widgetBase).
- De `_KDB.cognosAPI`-wrapper-laag zelf (waar die ook staat onder `KDB3/js/**`) — dit is het fundament van
  de hele adapter-strategie (rapport CC-1): controleer dat wrappers dun zijn (één host-chain, geen
  feature-flow/state) en dat de vocabulaire-catalogus compleet genoeg is om de module-adapters uit
  tranche 2 op te bouwen. Gaten hier eerst dichten vóór de adapter-rollout.
- `KDB3/js/KDB.js` (bootstrap) — mag tot 500 regels wiring-only zijn; controleer dat er geen business-logica
  in geslopen is en dat nieuwe modules (nativeMultiSelect, messageService, dashboardPdf, pdfExportControls)
  er correct gewired zijn.
- Overige mappen onder `KDB3/js/**` die niet in het rapport voorkomen: kort inventariseren en, indien
  productie-code, mini-auditen.

Plan deze kernlaag-audit vroeg (samen met de nulmeting), want de uitkomst stuurt tranche 2.

## OPDRACHT

Start met: (1) je eigen nulmeting (subagents), inclusief de mini-audits van de vier nieuwe modules en de
aanvullende kernlagen hierboven, (2) een kort voorstel aan de gebruiker: welke tranche/module eerst, welke
discussiepunten nu beslist moeten worden. Wacht op akkoord en voer daarna tranche voor tranche uit, met per
tranche een korte samenvatting (wat gefixt, welke findings obsolete bleken, wat is uitgesteld en waarom) en
een bijgewerkte `structure-remediation-log.md`.
