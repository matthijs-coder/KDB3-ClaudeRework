# Launch prompt — Track Remaining (na Track S + Track R)

> Paste into a **fresh** agent chat. Recommended: een sterk thinking-model als
> **planner / implementation captain for Track Remaining**;
> **cursor grok 4.6** voor begrensde implementatie-subagents.
> Dit is een REMEDIATION-opdracht (code wijzigt), **tranche voor tranche**,
> met expliciete stop-punten voor gebruikersbesluiten. Geen nieuwe features.
> Geen derde audit. Geen S/R ongedaan maken.
>
> Do **not** continue the Track-S of Track-R chat. Re-read live files.
> Commit only if PO vraagt. Do **not** push.

Gerelateerde prompts (niet opnieuw draaien):

- `contracts/structure-captain-remediation-launch-prompt.md` — Track S
  (lifecycle / P0 / destroy-registry). **Gedaan 2026-08-17; niet gecommit.**
  Niet overdoen. Gates, forbidden en merge-regels hieronder blijven gelden.
- `contracts/structure-readability-handoff-launch-prompt.md` — Track R
  (R0 pass-through/dead deletes). **Planner klaar; deze chat start daarna.**
  R0 niet overdoen. R1–R5 alleen als leftover.
- `architecture/readability-maintainability.md` — leftover R1–R5 (§5) en
  relaties (§8). **Geen** verse R0-werklijst. R6 = structure-audit / deze track.
- `contracts/structure-remediation-launch-prompt.md` — oudere remediation-only
  variant; niet de lead.
- `contracts/structure-audit-secondopinion-launch-prompt.md` — **niet** opnieuw
  draaien. Evidence is al geconsumeerd.

---

COMPLEXE TAAK — resterende audit- en leesbaarheidsschuld van een
Cognos-dashboard-extensie ná afgeronde safety (Track S) en R0-deletes
(Track R). Multi-module, dependency-geordend, **Batch B (Cognos-gedrag)
wacht op gebruikersakkoord**. Behandel als hoogcomplex.

Je bent de **third planner en implementation captain — Track Remaining**.
Je inventariseert wat ná S+R0 nog open is, stelt batches voor, wacht op
akkoord waar gedrag raakt, delegeert begrensde edits, reviewt diffs.
Je implementeert niet blind wat de structure-audits zeggen — die zijn
**geen** verse werklijst.

Project root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`
Target: `_____________KDB3API/`
Scope: productie-code onder `_____________KDB3API/KDB3/js/**`.
Legacy-mappen (`_______REDESIGN2/`, `laatsteOriginal/`, `_______KDB3/`) **NIET**
aanraken.

AUTHORITY (hoogste eerst):

1. Dit prompt (grenzen, S-invariants, batches, verboden, user gates).
2. Live code + Track-R afrondingssamenvatting van de gebruiker (of log +
   verificatie). Residual open items na S+R0.
3. `_____________KDB3API/architecture/projectStructureRules.md`
4. `_____________KDB3API/.cursor/rules/` (niet wijzigen tenzij PO dat vraagt)
5. Per module die je aanraakt: `contracts/<module>.md`

`architecture/readability-maintainability.md` §5 **R1–R6** en §8: R0 hoort
klaar te zijn; leftover R1–R5 mogen nog open zijn. R6 (ceremonial reducers,
thick cognosAPI, kennzahlDefaults) is **deze** track, geen R-herstart.

**Lees de audits niet opnieuw als to-do.**

`architecture/structure-audit.md` en `architecture/structure-audit-2.md`
(§7 Delta alleen zover nodig om een **resterend** item te lokaliseren):

- Evidence is **already consumed** (Track S + Track R). Geen second-opinion
  opnieuw. Geen derde volledige audit.
- Track S heeft de safety-P0’s al geïmplementeerd. Track R heeft R0-deletes
  gedaan (of moet dat volgens de R-samenvatting hebben gedaan).
- De Remaining-planner mag S-invariants niet “verbeteren” en R0 niet overdoen.
- Als een remaining item overlapt met een audit-finding: doe het omdat het
  **nog open** is in de lijst hieronder — niet omdat audit 1/2 het zei.
- Werk de auditrapporten **niet** bij.

---

## 0. Wanneer deze chat start

1. Lees de **Track-R afrondingssamenvatting** van de gebruiker. Ontbreekt die:
   **vraag ernaar** voordat je R-leftovers of Cognos-edits start. Bevestig dat
   R0-deletes geland zijn. **Niet** R0 overdoen. **Niet** Track S reverting.
2. Bevestig dat de **zes Track-S invariants** nog houden (live grep / korte
   steekproef, geen herschrijf). Working tree op S-paden kan nog uncommitted
   zijn — dat is geen uitnodiging om S te herschrijven.
3. Inventariseer wat **nog open** is (live code + leftover-R-lijst + OPEN WORK
   hieronder). Publiceer de inventory + welke batch nu.
4. Stel Batch-B-vragen die Cognos blokkeren. **Wacht op akkoord** vóór
   Batch-B-edits. Daarna batch voor batch.

---

## 1. Track S — gedaan (niet overdoen; S-gedrag behouden)

Track S (lifecycle / P0 / destroy-registry) is **verified 2026-08-17**: alle zes
invariants **PASS**. **Niet gecommit.** Raak S-sites alleen aan als een
**remaining issue die file echt nodig heeft**, en behoud dan de S-invariants
(timer-registry, `rejectAllTopNGateWaiters`, destroy-volgorde, gallery
AbortSignal-listeners).

| Site | Wat S deed |
|---|---|
| `cleanWidgetForTransfer.js` | Legacy `_KDB.state.widgets[widgetId]` teardown **verwijderd**. Runtime `byId`-teardown blijft. |
| widgetSettings | 50ms/0ms-timers geregistreerd op `runtime.widgetSettings.timers`; cleared on cleanup. |
| history reducer | `Date.now` verplaatst naar payloads in `createHistoryService.js`. |
| `KDB.js` | `metricsTree` in `destroyRegisteredFeatures` (na `filterDock`, vóór `kdbControl`); per-feature try/catch; `_teardownComplete`; services destroy all **except** `widgetBindingPlan`. |
| kdbControl gallery | document `mousedown` + gerelateerde listeners/timers op `runtime.kdbControl.listeners`. |
| widgetVis | `rejectAllTopNGateWaiters { destroyed: true, kind: "topN" }` vóór runtime wipe; focusMode 0ms in `runtime.timers.focusCheck`. |

Gedaan, niet heropenen als “P0-werk”: P0-1 timers, P0-2 topNGate reject,
P0-3 legacy widgets-key weg, P0-4 gallery mousedown teardown, KDB.js
destroy-registry, history reducer `Date.now`, focusMode timer-registry.

---

## 2. Track R — R0 hoort klaar te zijn (niet overdoen)

Track R mocht **alleen R0**. Verwacht (verifieer tegen R-samenvatting + live
importers, forceer geen tweede delete-ronde):

- `writeFrameworkView.js` (dood) weg
- dode `widgetVis` `writeLifecycle` weg (**alleen** die)
- lege kdbControl **toolbox**-orchestrator weg
- `*ControllerInternals.js` weg
- pass-through barrels (`runSingleSelectInteraction`,
  `observeDockPopupPipeline`, …) weg als ze puur re-export waren

**Live `writeLifecycle` in `widgetSettings` / `widgetDataTable` moet blijven.**
Dat zijn geen pass-throughs.

Als R0 een kandidaat **skipt** of **deferred** (bijv. overige `stage*`-files
buiten nativeMultiSelect): dat is leftover voor **Batch 0 / R3**, geen excuus
om R0-deletes terug te draaien.

R1–R5: alleen doen als R ze **niet** al gedaan heeft. R1 is een PO-gate
(geen `.cursor/rules` zonder gebruiker).

---

## 3. LOCKED / PRESERVE INVARIANTS

Geen harde never-touch als Batch 1/C de file écht nodig heeft — maar
**S-gedrag moet blijven**. Gallery size-split is gevaarlijk omdat S daar
listeners heeft gewired: **gallery niet splitsen in de eerste remaining
batch** (Batch 2: deferred tenzij de gebruiker erop staat).

Paden relatief t.o.v. `_____________KDB3API/KDB3/js/` (behalve `KDB.js`):

- `dashboard/widgets/widgetBase/effects/cleanWidgetForTransfer.js`
- `dashboard/widgets/widgetSettings/view/bindWidgetSettingsPanel.js`
- `dashboard/widgets/widgetSettings/runtime/cleanupWidgetControls.js`
- `core/services/historyService/state/createHistoryReducer.js`
- `core/services/historyService/createHistoryService.js`
- `KDB3/js/KDB.js`
- `dashboard/canvas/kdbControl/framework/buildControlPrimitiveGallery.js`
- `dashboard/widgets/widgetVis/effects/gates/topNGate.js`
- `dashboard/widgets/widgetVis/effects/resolveBindingPrerequisites.js`
- `dashboard/widgets/widgetVis/runtime/cleanupRuntime.js`
- `dashboard/widgets/widgetVis/effects/focusMode/focusModeObserver.js`

S-invariants bij elke touch: timer-registry, `rejectAllTopNGateWaiters`
vóór runtime wipe, destroy-volgorde (`metricsTree` na `filterDock` vóór
`kdbControl`; services all except `widgetBindingPlan`), gallery AbortSignal
(of equivalent geregistreerde) document-listeners, geen legacy
`_KDB.state.widgets[widgetId]` terugzetten.

---

## 4. Merge-regels (voor resterende items, geen verse audit-merge)

Zelfde geest als de captain-prompt; **niet** opnieuw beide audits inlezen
als werklijst.

- Finding in **beide** audits én nog open in live code → hoge zekerheid;
  nog steeds tegen code verifiëren (`file:line` kan verschoven zijn).
- Finding in **één** audit → extra live-verificatie verplicht.
- Bij tegenspraak: **actuele code + contracts + projectStructureRules**
  zijn scheidsrechter, niet een rapport.
- Severity-conflict op dezelfde leak/teardown-site: **P0 wint** (audit 1),
  tenzij de site in S/R al gefixt of verdwenen is — dan **niet heropenen**.
- Alles **needs-discussion** → **niet auto-fixen**; voorleggen (Batch B / C).
- Classificeer remaining items als **MUST / SHOULD / MAY / REJECT**.
  REJECT: kort waarom. Geen nieuwe architectuur “omdat het schoner oogt”.

Stale-evidence (niet opnieuw als tranche-0 behandelen): writeback
file-size-split is **al gedaan** — niet opnieuw als monolith-split.
`kennzahlDefaults` / tabs / kdbControl-sync blijven size-hubs. Regelnummers
in de audits zijn momentopnamen.

---

## 5. OPEN WORK — deze volgorde (dependency, niet “alles tegelijk”)

Dit is de werklijst. Audits zijn dat niet.

### Batch 0 — leftover readability (alleen als R ze liet liggen)

Uit `readability-maintainability.md` §5. Als R ze al deed: **skip**.

| Item | Inhoud | Gate |
|---|---|---|
| **R1** | Regel-doc vragen (§7): leftover-suffixes, optionele folders `actions/` `history/` `runtime/` `observation/`. Naming-policy voor **nieuwe** files. | **PO.** Geen `.cursor/rules` / `projectStructureRules.md` zonder gebruiker. |
| **R2** | Folder-renames **on touch**: `dashboardPdf/helpers` → `effects/`; header/footer/widgetSettings `dom/` → `view/`; bindingPlan/widgetTopN `utils/` → precisere folders. Geen big-bang van heel `dashboard/`. | SHOULD; paden wijzigen, gedrag gelijk. |
| **R3** | History-template inkorten (resterende `stage*` weg / `maybePush` hernoemen), één module per stap. | SHOULD; behoudend als commit-if-diff identiek blijft. |
| **R4** | Support-files hernoemen naar hun taak. widgetBase (+ remaining clones) adopteren `core/utils/filters/tabMutationRun` **als dat nog ontbreekt**. | SHOULD; overlap WP3 — niet overdoen. |
| **R5** | filterDock observation: synoniemen hernoemen, geen merge-refactor. `nativeMultiSelect` in `OWNER_ROUTE_MAP` verifiëren (audit-2 onzekerheid → discussion). | MAY. |

Niet mengen met Batch 1 (Cognos-gedrag) in dezelfde edit-ronde.

### Batch 1 — Cognos MUST (eerst gebruikers-**Batch B**)

Parked P0/MUST, gedrag-adjacent. **Niet starten** tot de gebruiker Batch B
beantwoordt. Geen auto-fix van needs-discussion.

- `singleSelect` `verifyCommitFilterValue.js` host-fallback
  `_filterApi.getValues()` — droppen of wrappen
- Thick wrappers: `dataQuery` flatten/poll; `visualization`
  `clearAllLocalFilters` / `getSlots` raw handles; `filters`
  `clearAllPageContextFilters`; `async.whenRenderStartComplete`
- Ontbrekende `setActiveTab` vs tabs-DOM `.click()` (`traverseTabs`)
- `window.top.WBParameter*` vs `_KDB.cognosAPI.writeback` (contract vs rubric)
- Bridge SET `RestoreResult` vs contract `void`; v2 map nog
  “not implemented”
- `dienststelle/state/selectors.js` Cognos-calls — naar effects
- Leaf verbs zodat callers geen raw `getContent` / `getSlots` /
  `getPageContext` meer doorgeven
- `cognosHost` CSS-catalogus (PDF spinner, page-classes, actionBar) —
  upgrade-surface

### Batch 2 — size hubs (mechanisch, verb-named splits, **geen** `*Support.js`)

- `kennzahlDefaults.js` sharden op prefix; **exacte TM1-strings behouden**
- tabs `traverse` / controller / reducer als die nog >150 executable zijn
- kdbControl `syncFrameworkViewFromState` (gallery-split **DEFERRED** tenzij
  de gebruiker erop staat; S-listeners behouden)
- Writeback **niet** opnieuw splitsen (al gedaan)

### Batch 3 — adapters + duplicatie (alleen waar Cognos écht geraakt wordt)

- Per-module `create*Adapter.js` — niet ceremonieel overal
- `tabMutationRun`-adoptie als die ná R4 nog ontbreekt
- `readDockRoot` consequent gebruiken
- `cloneSerializable` → utils
- `writeVerifiedSelection` (clones laten adopteren waar het al bestaat)
- **Geen** gezonde controller-rewrites (singleSelect / widgetBase /
  widgetVis / filterDock)

### Batch 4 — residual P1 leaks (mechanisch als nog open)

- `waitForFilterInventory` untracked timeouts
- metricsTree reducer `Date.now`-fallback — **niet** bevestigd P0; eerst
  verifiëren, niet als S-P0 behandelen
- dragDrop avatar / `document.body` als de leak nog geldt
- dragDrop rebind-poll was **NOT-A-BUG** geclassificeerd — **niet** “fixen”
  zonder live Cognos-bewijs **én** gebruiker

### Batch 5 — hygiene (eerst gebruikers-**Batch C**)

- disposed: throw vs warn vs no-op
- dispatch return-shape
- action-name constants
- ceremonial filter-reducers
- `collectReplayHandlers`: centrale registry vs self-register
- widget `runtime.widgets[id]` vs `widgetX.byId`
- Geen mass-`handle*`-rename

---

## 6. User gates (verplicht)

Voor elke batch (of eerder als de inventory het vraagt):

1. Korte status: wat is verified open / obsolete / al gedaan in S of R.
2. Concrete keuzevragen die **deze** batch blokkeren.
3. Voorstel: welke batch nu, welke MUST/SHOULD in scope, wat REJECT/deferred.
4. **Wacht op akkoord** vóór implementatie van die batch.

### Batch B — stel deze vragen vóór Cognos-edits

Niet parafraseren tot ze “vanzelf” ja worden. Niet auto-fixen.

1. `verifyCommitFilterValue.js`: host `.getValues()`-fallback **droppen**
   (alleen wrapper-pad) of **wrappen** als dunne
   `_KDB.cognosAPI.filters`-verb?
2. Thick wrappers (`dataQuery` flatten/poll, `clearAllLocalFilters`,
   raw `getSlots`, `clearAllPageContextFilters`,
   `whenRenderStartComplete`): flatten/poll/bulk/callback **uit de wrappers**
   (gedrag-adjacent) of **houden en documenteren**?
3. Tabs-activatie: `setActiveTab` in de adapter vs ruwe DOM `.click()` in
   `traverseTabs` — wat mag?
4. Writeback: gecontracteerd `window.top.WBParameter*` vs rubric
   `_KDB.cognosAPI.writeback` — contract wint, of theme toevoegen?
5. Bridge SET: implementatie geeft `RestoreResult`, contract zegt `void`.
   v2 map staat nog op “not implemented”. Structured return houden,
   naar `void` slikken, contract bijwerken, v2 documenteren als reserved,
   of implementeren?
6. `dienststelle/state/selectors.js`: Cognos naar effects verplaatsen
   (MUST, zoals singleSelect-selectors)?
7. Leaf verbs (`setContentPropertyValue`, slot-mutaties,
   `getPageContextItem`) zodat callers geen raw handles meer doortrekken —
   ja/nee, welke eerst?
8. `cognosHost` CSS-catalogus (PDF-spinner, `.page.*`, actionBar) nu
   upgraden, later, of alleen on-touch?

### Batch C — stel deze vragen vóór hygiene-edits

1. Disposed API: throw, warn, of no-op — één conventie?
2. Dispatch return-shape: welke `{ ok, status, errorCode, … }` is canoniek?
3. Action-names: constants overal, of alleen nieuwe/aangeraakte files?
4. Ceremonial filter-reducers (in-place mutations): family-conventie houden
   of reducer-rewrite (dat is een échte rewrite — default: niet in deze
   track tenzij PO ja zegt)?
5. `collectReplayHandlers`: self-register vs centrale lijst?
6. Widget-runtime: `runtime.widgets[id]` vs `widgetX.byId` — één pad?

---

## 7. FORBIDDEN

Geest van captain + readability-handoff:

- Legacy-mappen; nieuwe `_KDB.*` top-level namespaces.
- Big-bang over meerdere modules; folder-rename van heel `dashboard/`.
- Gezonde controllers herschrijven (singleSelect, widgetBase, widgetVis,
  filterDock). Writeback-monolith opnieuw splitsen.
- Speculatieve lagen (`FilterBase`, saga-framework, “voor later”).
- Nieuwe `*Support.js` / `*Shared.js` / `*Internals.js`.
- Cognos-gedrag mengen met cosmetische renames in dezelfde batch.
- Derde volledige audit; second-opinion-prompt opnieuw draaien.
- Auditrapporten bijwerken; authority-docs (`.cursor/rules/`, rubric,
  `projectStructureRules.md`) tenzij de gebruiker dat vraagt.
- Mass-`handle*`-rename; English-wash van domain-Duits / wire-keys
  (`sicht`, `dienststelle`, `kennzahl`; `filt`, `dstl`, `pcfs`).
- Track-S teardown/timer/destroy-sites “netter” maken zonder remaining-need.
- R0-deletes overdoen of live `writeLifecycle` (widgetSettings /
  widgetDataTable) verwijderen.
- Gallery splitsen in de eerste remaining batch; dragDrop rebind-poll
  “fixen” zonder live Cognos-bewijs + gebruiker.
- Gedrag wijzigen zonder expliciet gebruikersbesluit (needs-discussion /
  API-churn / semantiek).
- Blind fixen op verouderde `file:line`.

Line budget voor *nieuwe* of *gewijzigde* JS: executable ≤150, orchestrator
≤120, controller-fn ≤60, ≤10 AMD-imports. Splits **by job** (verb+noun),
niet by overflow onder de cap. Liever één goedgekeurde 160-regel
coordinator dan een nieuwe Support-file van 20 regels.

---

## 8. Principes

- **Delete > simplify > consolidate > refactor > abstract.** Geen nieuwe
  abstractie omdat die “architectonisch schoner” oogt.
- **Readability > fewer files.** Liever 10 files met werkwoorden dan 6
  genaamd Support/Shared/Internals.
- **Preserve useful boundaries:** `core/cognosAPI`, filterDock als
  observation-hub, `historyService`, writeback set-orchestrator, owner
  API’s, `runTabMutationSaga`, messageService public surface.
- **Gouden templates:** `nativeMultiSelect` (filter), `messageService`
  (service), `pdfExportControls` (control). Kopieer **niet** singleSelect’s
  shardwolk.
- **Cognos-upgrade-resilience:** dunne wrappers + adapters **alleen** waar
  Cognos écht geraakt wordt.
- Domain-Duits houden. Minimize behavioral change: echte bugs markeren als
  **bug fix** vs **behavior-preserving refactor**.
- Anti-overdesign: split/helper alleen bij (a) rule-overschrijding of
  (b) bestaande duplicatie weg.

---

## 9. Subagent-protocol

Planner (sterk thinking-model): inventory, allowlists, Batch-B/C-vragen,
review, stop-besluiten.
Implementatie: **cursor grok 4.6**, begrensd.

Elke implementatie-subagent krijgt:

1. Expliciete **allowlist** van files (eigenaar exclusief; **geen twee
   agents op hetzelfde bestand**).
2. Preserve-lijst uit §3 — S-invariants bij elke touch.
3. Invariants: AMD `define`; geen nieuwe leftover-suffixes; geen nieuwe
   `_KDB.*`; geen controller-rewrite; geen writeback-resplit; geen gallery-
   split tenzij de batch dat expliciet én met gebruikersakkoord doet.
4. Acceptatie: scope gehaald; callers geüpdatet; S/R niet teruggedraaid;
   diff door planner gereviewd.

Planner **reviewt elke diff zelf**. Accepteer niets blind.

Stop onmiddellijk als:

- een edit semantisch gedrag zou wijzigen zonder Batch-B/C-akkoord;
- twee agents dezelfde file zouden claimen;
- S-invariants of R0-deletes in gevaar komen;
- de batch afglijdt naar cosmetische renames + Cognos in één diff;
- de geplande change in de praktijk **slechter** blijkt — herzie, forceer niet.

Geen zwerm “review everything”. Delegeer alleen: (a) live verify van één
open item (`file:line`, importers), (b) één exclusive implementatie-batch.

Documentatie-plicht (geen scope-creep): bij structurele wijziging
`contracts/<module>.md` / `filesExplained.md` / `eventSubscribe.md`
bijwerken waar van toepassing — niet als excuus voor extra refactors.

---

## 10. Voortgang

Werk `architecture/structure-audit.md` en `structure-audit-2.md` **niet** bij.

Append `_____________KDB3API/architecture/structure-remediation-log.md`
(aanmaken als hij ontbreekt; bestaat hij al vanuit S/R: **alleen appenden**,
S/R-rijen niet herschrijven):

`finding → status: fixed | obsolete | deferred | needs-discussion | rejected`,
datum, korte noot.

Na elke betekenisvolle batch: korte samenvatting (wat gefixt, wat obsolete,
wat deferred/rejected en waarom). Eindrapport:

### Implemented
### Rejected / deferred
### S/R invariants
Nog intact? Welke S-files (niet) aangeraakt?
### Remaining issues
Bewust buiten deze track.
### Confidence / risks
Cognos-integratie, dunne tests, onduidelijke legacy-intent.

---

## OPDRACHT — start hier

1. Bevestig dat de **S-invariants** nog houden en dat **R0** geland is
   (gebruiker / Track-R-samenvatting / live importers). Niet R0 overdoen.
   Niet Track S reverting. Audits **niet** opnieuw als to-do lezen.
2. Publiceer de **remaining inventory** (Batch 0 leftovers vs Batch 1–5) en
   welke batch **nu** aan de beurt is. Skip wat S of R al deed.
3. Stel de **Batch B**-vragen die Cognos nog blokkeren (`getValues`, thick
   wrappers, `setActiveTab`, `window.top`, v2/bridge, dienststelle
   selectors, leaf verbs, cognosHost). **Wacht op akkoord.**
4. Voer daarna **batch voor batch** uit met cursor grok 4.6, exclusive
   file-lists, planner-review. Batch C-gates vóór hygiene. Log appenden.

Target is **niet** de slimste architectuur. Target is resterende
audit- én leesbaarheidsschuld sluiten **zonder** S/R ongedaan te maken en
**zonder** nieuwe architectuur te verzinnen — saai, voorspelbaar,
Cognos-upgrade-vriendelijk.
