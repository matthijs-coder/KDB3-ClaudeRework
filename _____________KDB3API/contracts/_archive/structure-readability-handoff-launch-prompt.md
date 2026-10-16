# Launch prompt — Track R (readability) na Track S

> Paste into a **fresh** agent chat. Recommended: een sterk thinking-model als
> **readability planner / implementation captain for Track R**;
> **cursor grok 4.6** voor begrensde implementatie-subagents.
> Dit is een REMEDIATION-opdracht (code wijzigt), strikt **gedragsbehoudend**.
> Geen nieuwe features. Geen Cognos-gedrag. Geen size-hub splits.
>
> Do **not** continue the Track-S (structure/safety) chat. Re-read live files.
> Commit only if PO vraagt. Do **not** push.

Gerelateerde prompts (niet opnieuw draaien):

- `contracts/structure-captain-remediation-launch-prompt.md` — Track S (lifecycle /
  P0 / destroy-registry). **Gedaan 2026-08-17; niet gecommit.** Niet overdoen.
- `architecture/readability-maintainability.md` — **enige werklijst** voor Track R
  (R0–R5; §2 Niet doen; §8 relatie tot audits).
- `contracts/structure-remediation-launch-prompt.md` — oudere remediation-only
  variant; niet de lead voor R.

---

COMPLEXE TAAK — leesbaarheidsremediatie van een Cognos-dashboard-extensie na een
afgeronde safety-tranche. Multi-module, gedragsbehoudend, **R0 eerst**, daarna
stoppen voor gebruikersbesluit. Behandel als hoogcomplex.

Je bent de **readability planner en implementation captain for Track R**.
Je plant R0, delegeert begrensde deletes, reviewt diffs, en stopt na R0.
Je implementeert niet blind wat de structure-audits zeggen — die zijn **geen**
R-werklijst.

Project root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`
Target: `_____________KDB3API/`
Scope: productie-code onder `_____________KDB3API/KDB3/js/**`.
Legacy-mappen (`_______REDESIGN2/`, `laatsteOriginal/`, `_______KDB3/`) **NIET**
aanraken.

AUTHORITY (hoogste eerst):

1. Dit prompt (grenzen, locked files, R0-only, verboden).
2. `_____________KDB3API/architecture/readability-maintainability.md` — **enige
   werklijst**. Start met **R0 only**.
3. `_____________KDB3API/architecture/projectStructureRules.md`
4. `_____________KDB3API/.cursor/rules/` (niet wijzigen tenzij PO dat vraagt)
5. Per module die je aanraakt: `contracts/<module>.md`

**Lees de audits niet opnieuw als to-do. Ze zijn input van Track S.**

`architecture/structure-audit.md` en `architecture/structure-audit-2.md` mag je
**één keer** noemen als **grenzen / evidence already consumed**:

- Track S heeft de safety-items uit die audits al geïmplementeerd.
- De R-planner mag Cognos-wrappers, size-hub splits, destroy-registry of
  leak-hunts uit de audits **niet heropenen**.
- Wijs agents naar `readability-maintainability.md` als **enige** werklijst.
- Als een leesbaarheidsitem overlapt met een audit-item (dode
  `writeFrameworkView` / `writeLifecycle` / lege toolbox), doe het omdat **R0
  pass-throughs verwijdert** — niet omdat audit 1 het zei.
- Werk de auditrapporten **niet** bij.

---

## 0. Track S — gedaan (niet overdoen, niet “verbeteren” in R0)

Track S (lifecycle / P0 / destroy-registry) is **verified 2026-08-17**: alle zes
invariants **PASS**. **Niet gecommit.** Raak deze sites in R0 niet aan, ook niet
voor “kleine leeswinst”.

| Site | Wat S deed |
|---|---|
| `cleanWidgetForTransfer.js` | Legacy `_KDB.state.widgets[widgetId]` teardown **verwijderd**. Runtime `byId`-teardown blijft. |
| widgetSettings | 50ms/0ms-timers geregistreerd op `runtime.widgetSettings.timers`; cleared on cleanup. |
| history reducer | `Date.now` verplaatst naar payloads in `createHistoryService.js`. |
| `KDB.js` | `metricsTree` in `destroyRegisteredFeatures` (na `filterDock`, vóór `kdbControl`); per-feature try/catch; `_teardownComplete`; services destroy all **except** `widgetBindingPlan`. |
| kdbControl gallery | document `mousedown` + gerelateerde listeners/timers op `runtime.kdbControl.listeners`. |
| widgetVis | `rejectAllTopNGateWaiters { destroyed: true, kind: "topN" }` vóór runtime wipe; focusMode 0ms in `runtime.timers.focusCheck`. |

Verifieer van S: **zes invariants PASS (2026-08-17)**. Working tree op die paden
kan nog uncommitted zijn — dat is geen uitnodiging om S te herschrijven.

---

## 1. LOCKED FILES — R-agents mogen deze niet wijzigen

Als een R0-delete een locked file zou moeten raken: **skip en rapporteer**.
Niet “even een import aanpassen” in een locked file.

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

Paden relatief t.o.v. `_____________KDB3API/KDB3/js/` (behalve `KDB.js`, die
daar al staat).

---

## 2. Bron van waarheid — alleen R0 in deze chat

`architecture/readability-maintainability.md` is de **enige** werklijst.

| Tranche | In deze chat? |
|---|---|
| **R0** — delete pass-throughs / dood scaffolding | **Ja. Start hier. Stop hier.** |
| **R1** — regel-addities (authority-docs, naming-policy) | **Nee.** Wacht op gebruiker. |
| **R2** — folder-renames (`helpers`→`effects`, `dom/`→`view/`, …) | **Nee.** Wacht op gebruiker. |
| R3–R5 (history-template, Support-hernoemen, filterDock-synoniemen) | **Nee.** |
| R6 (ceremonial reducers, thick cognosAPI, kennzahlDefaults) | **Nee** — structure-audit / Track C, niet R. |

Na R0: korte samenvatting + leftover-lijst. **Niet** automatisch R1 of R2 starten.

Lees zelf, éénmalig: readability §1 oordeel, **§2 Niet doen**, §3.4 pass-throughs,
**§5 R0**, §7 gouden templates, **§8 relatie tot audits**. Daarna live files,
niet het geheugen van Track S.

---

## 3. R0-allowlist (readability §5)

Delete pass-throughs en dood scaffolding. **Elke kandidaat eerst verifiëren:**
ongebruikt **of** pure pass-through (re-export / één call, geen extra gedrag).
Twijfel = skip + rapporteren. Een “delete” die semantisch gedrag zou wijzigen:
**stop**, forceer niet.

Kandidaten (geen garantie — live bewijs verplicht):

- `*ControllerInternals.js` (o.a. `singleSelectControllerInternals.js`)
- `runSingleSelectInteraction.js` barrel **als** het een pass-through is
- `observeDockPopupPipeline.js` barrel **als** het een pass-through is
- lege kdbControl **toolbox**-orchestrator
- `writeFrameworkView.js` (dood)
- `writeLifecycle.js` (dood)
- **Optionele proef:** `stage*` inlinen in **één** module only — voorkeur
  `nativeMultiSelect`, niet alle owners tegelijk

Overlappende audit-items (`writeFrameworkView`, `writeLifecycle`, lege toolbox):
wel doen **omdat R0 pass-throughs verwijdert**, niet omdat audit 1 het zei.

Per subagent: **exclusieve file-ownership**. Geen twee agents op hetzelfde
bestand. Callers die alleen de import/re-export hoeven te wijzigen horen in
dezelfde allowlist-batch, of de delete wacht tot die callers in scope zijn —
nooit via een locked file.

Line budget blijft gelden voor *nieuwe* of *gewijzigde* JS: executable ≤150,
orchestrator ≤120, controller-fn ≤60, ≤10 AMD-imports. R0 mag files **kleiner**
maken of verwijderen; geen nieuwe ceremony om onder de cap te blijven.

---

## 4. FORBIDDEN

- **Cognos-gedrag** (`setActiveTab`, `getValues`, thick wrappers,
  `window.top` writeback) — Batch B / Track C, niet R.
- **Size-hub splits** (`kennzahlDefaults`, tabs traverse/controller/reducer,
  gallery 607), vooral niet naar `*Support.js`.
- **Gezonde controllers herschrijven** (singleSelect, widgetBase, widgetVis,
  filterDock).
- **Writeback opnieuw splitsen.**
- **Big-bang folder-rename** van `dashboard/`.
- **Nieuwe generieke lagen** (`FilterBase`, saga-framework, nieuwe `_KDB.*`).
- **Mass-rename** van `handle*.js`.
- **Rename-PRs mengen met Cognos.**
- **parameterSet / tabMutation WP0–WP4 overdoen** als die al gedaan zijn
  (readability §5 / §8).
- **Authority-docs** (`.cursor/rules/`, rubric, `projectStructureRules.md`)
  tenzij de gebruiker dat vraagt — **R1 is een latere gate**.
- **Nieuwe** `*Support.js` / `*Shared.js` / `*Internals.js`.
- Locked files uit §1 aanraken.
- Track-S teardown/timer/destroy-sites “netter” maken.
- Legacy-mappen; `.mdc` wijzigen; audits bijwerken.
- Gedrag wijzigen zonder expliciet gebruikersbesluit.

---

## 5. Principes (readability §1–§2, §7)

- **Readability > fewer files.** Liever 10 files met duidelijke werkwoorden dan
  6 files genaamd Support/Shared/Internals.
- **Split by job** (verb+noun), niet by overflow onder de 150-regel cap.
- **Gouden templates:** `nativeMultiSelect` (filter), `messageService` (service),
  `pdfExportControls` (control). Kopieer **niet** singleSelect’s shardwolk.
- **Voorkeursrichting:** delete > rename > move. R0 is bijna alleen delete.
- Geen nieuwe abstractie omdat die “architectonisch schoner” oogt.
- Flatten geen nuttige grenzen (`core/cognosAPI`, filterDock als observation-hub,
  `historyService`, writeback set-orchestrator, owner API’s, `runTabMutationSaga`,
  messageService public surface).
- Domain-Duits houden (`sicht`, `dienststelle`, `kennzahl`). Geen English-wash
  van wire-keys (`filt`, `dstl`, `pcfs`).

---

## 6. Subagent-protocol

Planner (sterk thinking-model): nulmeting, allowlists, review, stop-besluiten.
Implementatie: **cursor grok 4.6**, begrensd.

Elke implementatie-subagent krijgt:

1. Expliciete **allowlist** van files (eigenaar exclusief; geen overlap).
2. Locked-file-lijst uit §1 — niet aanraken.
3. Invariants: gedragsbehoud; AMD `define`; geen nieuwe leftover-suffixes;
   geen nieuwe `_KDB.*`; geen Cognos/size-hub/controller-rewrite.
4. Acceptatie: kandidaat was unused of pure pass-through; callers geüpdatet of
   batch geskipt; geen locked-file-touch; diff door planner gereviewd.

Planner **reviewt elke diff zelf**. Accepteer niets blind.

Stop onmiddellijk als:

- een “delete” semantisch gedrag zou wijzigen;
- een delete een locked file nodig heeft;
- twee agents dezelfde file zouden moeten claimen;
- de batch afglijdt naar rename, folder-move, Cognos of size-hub.

Geen zwerm “review everything”. Delegeer alleen: (a) dead/pass-through-verify
per kandidaat (`file:line`, importers), (b) één exclusive delete-batch.

---

## 7. Na R0 — stop

Korte samenvatting aan de gebruiker:

### Implemented
Welke pass-throughs/scaffolding weg, per file.

### Skipped
Kandidaten die geen pure pass-through bleken, of locked-file raakten, + waarom.

### Leftovers (niet starten)
R1 (docs), R2 (folder-renames), R3–R5, optionele `stage*`-proef als die niet in
R0 zat of niet in één module bleef.

### Verify
Grep op verwijderde symbolen/paden; geen dangling AMD; locked files ongewijzigd.

**Niet** automatisch R1/R2 starten. Wacht op PO.

Optioneel: append aan
`_____________KDB3API/architecture/structure-remediation-log.md` als je die
**aanmaakt** (`finding → status: fixed | obsolete | deferred | skipped`, datum,
korte noot). Bestond hij al vanuit Track S: alleen R0-regels **appenden**, S-regels
niet herschrijven. **Auditrapporten niet wijzigen.**

---

## OPDRACHT — start hier

1. Bevestig dat de **locked files** uit §1 nog bestaan (geen rename/verdwenen
   path). Bevestig dat R0-kandidaten nog **dood / pass-through** zijn (importers,
   re-export vs gedrag). Audits **niet** opnieuw als to-do lezen.
2. Voer R0-deletes uit in **kleine exclusive batches** (cursor grok 4.6),
   planner reviewt diffs. Optionele `stage*`-proef alleen in **nativeMultiSelect**,
   niet alle owners.
3. **Stop.** Samenvatting + leftover-lijst. Geen R1, geen R2, geen commit tenzij
   PO vraagt.

Target is **niet** de slimste architectuur. Target is een codebase die **saaier
te lezen** is — minder pass-throughs, minder restbak-files — zonder Track S
ongedaan te maken en zonder Cognos of size-hubs in dezelfde chat.
