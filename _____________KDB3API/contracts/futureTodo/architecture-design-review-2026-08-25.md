# Architecture & Explainability Review — `KDB3/js`

> **Read-only design review, 2026-08-25.** No code, contract or rule was changed in this pass.
> Branch `audit`, HEAD `fcb8dbf`. Scope: all production JS under `KDB3/js/**` excluding
> `core/libraries/`. 1509 files, ~93 000 lines.
>
> This is **not** a fourth hygiene audit. `structure-audit.md` (2026-07-10),
> `structure-audit-2.md` (2026-08-16) and `readability-maintainability.md` (2026-08-16) covered
> file size, Cognos isolation, leaks, naming and folder shape, and their tactical findings are
> largely remediated (`structure-remediation-log.md`). This pass asks a different question:
> **is the design solid, are the component blocks real blocks, and can a human be told how this
> works?**

---

## Samenvatting voor de PO (NL)

**Korte antwoord op de vier vragen.**

1. **Is de architectuur solide?** Ja, in de kern. De centrale disciplines — serialiseerbare
   state in `_KDB.state`, technische objecten in `_KDB.runtime.<owner>`, één publieke
   modulevorm, Cognos achter een ring — houden echt stand, niet alleen op papier. Dit is geen
   codebase die uit de hand is gelopen.

2. **Zijn de componentblokken helder afgebakend?** Wisselend, en dat is het echte probleem.
   Van de zes diep onderzochte blokken kregen twee `mostly-crisp` en vier `blurry`. De
   grenzen die het slechtst zijn, zijn niet de grenzen die de regels bewaken.

3. **Is het onderhoudbaar?** Grotendeels ja, met één scherpe uitzondering: de **deelnemerslijsten**
   van de drie sagas. Het mechanisme van parameterSet-restore is uitstekend gebouwd; de
   tabMutation-deelnemerslijst staat als letterlijke array **zeven keer** in twee bestanden.
   Eén vergeten kopie betekent stille, inconsistente state na een mislukte tab-mutatie.

4. **Is het uitlegbaar aan een mens?** **Dit is de zwakste as.** Geen enkel onderzocht blok
   scoorde hoger dan 3/5 op uitlegbaarheid; vier scoorden 2/5. De oorzaak is niet
   codekwaliteit — losse bestanden zijn vaak voorbeeldig — maar dat de kennis *waar* iets
   gebeurt niet staat waar je hem zoekt.

**Wat ik expliciet níet vind.** Het beeld "veel duplicatie, dus een ontbrekende abstractie"
klopt niet meer. Het consolidatieprogramma (`parameterSet-tabMutation-consolidation-refactor-prompt.md`,
WP0–WP7) is uitgevoerd, en WP5 is **bewust niet** samengevoegd met vijf onderbouwde
gedragsverschillen. Dat is precies de juiste beslissing. De overgebleven repetitie is
grotendeels doelbewust. Wie hier nog een grote abstractie in wil bouwen, zou schade doen.

**De vijf dingen die wél aandacht vragen**, in volgorde van opbrengst per euro:

| # | Kern | Kosten |
|---|---|---|
| F2 | tabMutation-deelnemerslijst staat 7× hardgecodeerd → maak er één bevroren lijst van | goedkoop |
| F7 | 108 dispatch-actietypes zonder catalogus, terwijl 6 echte events een catalogus van 256 regels hebben | goedkoop |
| F8 | De vier goedkope wegwijzer-documenten uit het vorige voorstel zijn nooit gemaakt | goedkoop |
| F4 | `writeback` is de applicatie-orchestrator, niet infrastructuur — het label liegt | middel |
| F3 | `singleSelect` gebruikt generieke "owner"-taal voor logica die hardgecodeerd `sicht` is | middel |

**Eén ding als je maar één ding doet:** F7 + F8 samen. Dat is een paar dagen werk, verandert
geen enkele regel gedrag, en pakt de as aan die het slechtst scoort.

---

## 1. Method

Two rounds of read-only Opus subagents (per-module deep dives and cross-cutting design lenses)
plus direct measurement by the lead. Every figure in Appendix A was measured against the working
tree and is reproducible from the commands in A.12. Findings without a `file:line` citation were
discarded.

The lead independently traced the three cross-cutting protocols end to end; those traces are the
basis of F1–F6 and are cited inline rather than attributed to an agent.

**Deliberate constraint:** for the explainability question, the code was read *before* the
contracts, and the gap between the two was recorded. That gap is F8.

---

## 2. Verdict

| Question | Verdict |
|---|---|
| Solid at the overarching level? | **Yes, with one mislabelled block.** The ring model is real and mostly obeyed. The exception (F4) is a naming error, not a structural failure. |
| Individual components solid? | **Uneven.** 2 of 6 `mostly-crisp`, 4 of 6 `blurry`. Blurriness clusters where a module grew a second job it was never renamed for. |
| Clear, delimited responsibilities? | **At module level yes, at protocol level no.** Every module has a defensible charter. The three sagas cut across all of them and have no owner in the folder tree. |
| Easily maintainable? | **Yes for module-local change, no for protocol change.** Adding a filter means touching a set no one can enumerate from the code. |
| Explainable to another human? | **Not today, and the reason is fixable.** Highest explainability score across six deep-read blocks was 3/5. Nothing in the tree tells a newcomer where to start; the four documents that would have are the four that were never written. |

**The one-sentence characterisation.** KDB3 is a well-run codebase with a genuine engineering
culture whose *mechanisms* are better than its *signposts* — it has built the right abstraction
in the place that matters most, and has not told anyone where it is.

---

## 3. What is genuinely strong

Not politeness. Any remediation must protect these.

**S1 — State/runtime separation is real.** `_KDB.runtime` has ~30 owners, cleanly one per module.
`tableData` is the proof case: `grep "state.tableData"` outside the service returns **zero** hits;
all 14 consumers go through `_KDB.services.tableData`, and all four mutations funnel through
`state/writers/mark*.js`. That is the cleanest ownership boundary you would expect in a 93k-line
codebase.

**S2 — Public API uniformity.** Twenty-two feature modules, and the surface is genuinely
predictable: `{ mount, destroy, dispatch, getState }`, with exactly three modules adding one extra
method each (`kdbControl.syncView`, `dienststelle.getCurrentHierarchySnapshot`,
`header.applyAction`). Learn one module, you have learned all of them. This is the single most
valuable property the codebase has.

**S3 — Cognos containment at the entry point.** `__getDashboardAPI()` appears 71 times, all inside
`core/cognosAPI`. Outside the two `cognos*` layers, only 4 of 1509 files mention `cognosAPI`, and
3 of those are error strings. The strategic goal — a Cognos upgrade touches ring 1 — is
substantially achieved.

**S4 — `dispatchOwnerPhase` is genuinely good infrastructure.**
`core/services/writeback/set/effects/dispatchOwnerPhase.js` (105 lines) is fully generic
(`_KDB.api[spec.owner]`, no name switch), enforces `source`/`runId`/`skipHistory` metadata,
cancels on stale runs via `run.assertStillCurrent()`, records structured per-phase diagnostics,
supports per-phase `required` vs `degradedAllowed`, and — importantly — **detects a participant
that never implemented a phase**: line 47 distinguishes "owner reported failure" from
`owner "X" did not acknowledge <type> (dispatch target not implemented)`. Missing participants in
the restore protocol are *not* a silent failure. This is real, designed infrastructure and it is
the best code in the project.

**S5 — The team knows when *not* to abstract.** WP5 of the consolidation programme was
investigated and **declined**, with five documented behavioural differences between the restore
and seed pipelines (order, commit-vs-dispatch, fail-fast vs collect, stale-cancel vs readiness,
defaults-for-missing-keys). Declining a tempting merge on evidence is a mark of maturity, and it
means the remaining duplication should be assumed deliberate until proven otherwise.

**S6 — The programme actually executes.** `*Support.js` 18→8, `*Shared.js` 4→2, `*Internals.js`
2→0, `maybePush*.js` 7→0, `stage*HistoryReplayHandler.js` 11→0. Only 21 files exceed the 150-line
limit and 12 of those are config data. Which is why the *un*executed recommendations in A.10 are
worth revisiting rather than assuming they were skipped for cause.

**S7 — The newest code is the best code.** `messageService`, `loadingService`,
`pdfExportControls`, `nativeMultiSelect` are consistently cleaner than their older siblings.
Remediation can be "converge on the good example" rather than "invent a design".

**S8 — Individual files are usually excellent.**
`kdbControl/actions/applySettingsAction.js:33-55` reads top-to-bottom as gate → reduce → commit →
side-effects → history → sync, each step one named import.
`kdbControl/actions/buildParameterSetRestoreActions.js:12-27` is a 14-row declarative table.
`filterDock/config/ownerRoutes.js` is a clean registry. The problem below is almost never the
quality of a single file.

---

## 4. Findings

### F1 — The same structural problem is solved at three quality tiers, and nothing tells you which tier you are in — **P0 (comprehension)**

"Fan a coordinated operation out to a set of owner modules" occurs three times in this codebase,
implemented three ways:

| Tier | Where | Mechanism |
|---|---|---|
| **Best** | `core/services/writeback/set/` | Frozen 31-phase ordered enum (`config/restoreConstants.js:7-16`) + fully generic dispatcher `effects/dispatchOwnerPhase.js` keyed on `_KDB.api[spec.owner]`, with per-phase `required`/`degradedAllowed`, stale-run cancellation and missing-participant detection. |
| **Good** | `dashboard/filters/filterDock/config/ownerRoutes.js` | One declarative 67-line table, one row per filter, carrying `apiKey`, the action types it dispatches, and per-owner capability flags. Two consumers only (`effects/resolveOwnerRoute.js`, `effects/dispatchFilterHandoff.js`). Adding a filter = adding a row. |
| **Worst** | `dashboard/filters/singleSelect/actions/` | Hardcoded owner names in string comparisons across 7+ files (see F3). |

All three are correct today. The cost is not correctness — it is that a developer arriving at any
one of them cannot tell which convention governs, and generalises from whichever they saw first.
There is no document or naming signal distinguishing them.

**Recommendation (medium).** State the tiering explicitly, then move tier 3 → tier 2 (F3) and give
tier 2's participant list the same frozen-single-source treatment as tier 1 (F2). The abstraction
you would otherwise design **already exists** in `dispatchOwnerPhase.js`; the work is propagation,
not invention.

---

### F2 — The tabMutation participant list is a literal duplicated seven times — **P0**

`dashboard/tabs/actions/runTabMutationSaga.js` and `effects/clearTabMutationSnapshots.js` hardcode
the owner list as inline array literals in **seven** places:

```
runTabMutationSaga.js:31   ["widgetBase","singleSelect","dienststelle","nativeMultiSelect"]  prepare
runTabMutationSaga.js:36   ["singleSelect","dienststelle","nativeMultiSelect"]               filter apply
runTabMutationSaga.js:38   ["widgetBase","singleSelect","dienststelle","nativeMultiSelect"]  rollback
runTabMutationSaga.js:45   ["widgetBase","singleSelect","dienststelle","nativeMultiSelect"]  rollback
runTabMutationSaga.js:51   ["widgetBase","singleSelect","dienststelle","nativeMultiSelect"]  rollback
runTabMutationSaga.js:54   ["singleSelect","dienststelle","nativeMultiSelect"]               host resync
clearTabMutationSnapshots.js:6  SNAPSHOT_OWNER_KEYS = [same four]
```

The lists are **correct today** — verified against actual participation: `singleSelect` 10 files
under `actions/tabMutation/`, `dienststelle` 10, `nativeMultiSelect` 11, `widgetBase` 4 handler
files; `sicht`, `specialSingleSelect` and `filterDock` have zero and correctly do not appear. The
4-vs-3 difference (widgetBase excluded from filter-apply and host-resync) is intentional.

Note the contrast: the *mechanism* here is good. `actions/runTabMutationOwnerPhases.js:57-70`
dispatches `owner + "/" + _suffix` with the owner list as a parameter — no name switch, two-phase
commit, real rollback, a `degraded` status. Only the **registry** is the problem.

**Why it matters.** Adding a seventh filter to tabMutation means creating ~10 files in the new
module *and* editing seven array literals across two files, with no single list to find them from
and no test that the seven agree. Three of the seven are rollback lists: omitting one means a
failed tab mutation silently leaves that module's snapshot un-restored — inconsistent state, no
diagnostic. Nothing in `runTabMutationOwnerPhases.js` can detect an owner that was never listed.

**Recommendation (cheap — hours).** One frozen `tabs/config/tabMutationOwners.js` exporting
`PREPARE_OWNERS`, `APPLY_OWNERS`, `RESYNC_OWNERS`, `ROLLBACK_OWNERS` (today's exact values, so
behaviour is unchanged), consumed by both files. This is the single highest
value-per-hour item in this report.

---

### F3 — `singleSelect` speaks generic "owner" vocabulary over hardcoded `sicht` logic — **P0 (comprehension)**

Five files in `dashboard/filters/singleSelect/actions/` carry deliberately generic names —
`applyOwnerSelection.js`, `awaitOwnerInventoryAck.js`, `inventoryOwnerDispatch.js`,
`notifyInventoryReconciledOwners.js`, `ownerSelectionSupport.js` — implying a registry-driven
protocol. The implementation is a name switch:

```
awaitOwnerInventoryAck.js:6          var OWNER_NAMES = ["sicht", "specialSingleSelect"];
inventoryOwnerDispatch.js:9          return _ownerName === "sicht" ? ...
applyOwnerSelection.js:17,32,68      three separate  !== "sicht"  guards
notifyInventoryReconciledOwners.js:54  notifyOwnerOnce(_KDB, _runtime, "sicht", ...)
ownerSelectionSupport.js:30,38       _KDB.api.sicht ; dispatches "sicht/singleSelectCommitted"
parameterSet/parameterSetResyncApply.js:13   record.selectionOwner !== "sicht"
parameterSet/filterRestoreSupport.js:15      key === "sicht" || key.indexOf("dienststelle") === 0
effects/classifyFilterInstance.js:26-27      if (_scopeType === "global" && name === "sicht")
effects/sichtDraftEvents.js                  a generic module's file named after one consumer
```

Plus one hard import of a sibling's internals:
`actions/parameterSet/parameterSetResyncApply.js:6` → `../../../sicht/state/selectors.js`.

More broadly, the generic filter engine knows its specific consumers by name: 19 files in
`singleSelect` mention `sicht`, 14 mention `specialSingleSelect`, 13 mention `filterDock`, 4
mention `dienststelle`.

**Why it matters.** The names actively mislead. A developer reading `applyOwnerSelection` or
`notifyInventoryReconciledOwners` reasonably concludes owners are registered somewhere and that
adding one is a registration. In fact it is an edit to at least seven files, discoverable only by
grepping for `"sicht"`. This is the clearest instance in the codebase of naming that lies about
mechanism, and it is worse than honest specificity would be: `notifySichtAfterCommit` would at
least be true.

**On the `sicht` ↔ `singleSelect` cycle.** The delegation direction is *defensible*: `sicht` owns
which view is chosen (real state — `byOption`, `currentSelection`, `backupSelection`, availability
from `tableData`), `singleSelect` owns the vendor filter-widget interaction. `sicht` is a real
module, not a facade. `delegateToSingleSelect.js:48-49` even carries a genuinely useful boundary
comment ("Cloned, call-local snapshot of Sicht's own state (contract §4) … never persists it").
The *back-edge* is the defect — the generic engine importing the specific consumer's selectors.

**Recommendation (medium).** Give `singleSelect` an owner route table modelled on
`filterDock/config/ownerRoutes.js` — the pattern already exists three folders away. Failing that,
rename the five files to say `Sicht` and delete the false generality; honest specificity is
cheaper than a lie.

---

### F4 — `writeback` is the application restore orchestrator, filed as infrastructure — **P1**

`core/services/writeback` (80 files, 6246 lines) registers four services and holds the single most
complex behaviour in the product. Its restore sequence is a frozen 31-phase enum
(`set/config/restoreConstants.js:7-16`), of which **19 phases are named after specific dashboard
feature modules**: `kdbControlRestore`, `headerRestore`, `footerRestore`, `tabsRestore`,
`sichtRestore`, `singleSelectGlobalRestore`, `singleSelectPageContextRestore`,
`singleSelectPreRestoreReconcile`, `singleSelectResync`, `nativeMultiSelectRestore`,
`sichtDownstreamVisibility`, `dienststelleRestore`, `specialSingleSelectRestoreSync`,
`widgetBaseRestore`, `widgetSettingsRestore`, `widgetTextRestore`, `widgetVisBinding`,
`tabWidgetsEnsureRouted`, `tabsPostRestoreTraverse`.

It also statically imports `dashboard/` in 13 places, has one collector file per feature module
(`collectDienststelleFilter.js`, `collectNativeMultiSelect.js`, `collectHeaderFooter.js`,
`finalizeSingleSelectRun.js`, `singleSelectCollector{Inventory,Materialize,Scope}.js`), and
dispatches a feature-specific action type into a feature module
(`get/collectors/collectFilterTargets.js:15-18` → `{ type: "tabs/resolveFilterScopeTargets" }`).

**This is not a bug.** The restore choreography is genuine, irreducible domain knowledge — the
order encodes real constraints ("activate the target tab before restoring page-context filters",
"sicht's downstream visibility depends on singleSelect's global commit"). It has to live
somewhere, and centralising it beats scattering it. The infrastructure built around it (S4) is
excellent.

**The defect is the label.** A folder under `core/services/` that names 19 feature phases and
imports `dashboard/` 13 times is not a service; it is the application layer. Calling it
infrastructure makes the ring model in `projectStructureRules.md` false as written, which in turn
makes every future "may I import dashboard from core?" question unanswerable by rule.

**Recommendation (medium, mechanical).** Do not move the logic — relabel the layer. Either
introduce a third ring (`app/` or `core/orchestration/`) that is *permitted* to know features and
move `writeback` into it, or amend `projectStructureRules.md` to name `writeback` as the one
declared application-level orchestrator with a stated reason. The former is honest; the latter is
cheap. Either beats the current state, where the rule and the tree disagree and the tree wins
silently.

---

### F5 — You cannot understand a filter's restore behaviour by reading that filter — **P1 (comprehension)**

The 31-phase restore sequence is executed across three files —
`set/effects/runNormalRestore.js` (6 phases, 91 lines), `runFilterRestore.js` (9 phases, 145),
`runWidgetRestore.js` (5 phases, 75), plus `dispatchFilterClearPhases.js` (4). The filter segment
interleaves owners:

```
sichtRestore → singleSelectGlobalRestore → tabActivateForPageContext →
singleSelectPageContextRestore → nativeMultiSelectRestore → sichtDownstreamVisibility →
dienststelleRestore → singleSelectResync → specialSingleSelectRestoreSync
```

`singleSelect` participates in **5 of the 31 phases**, at four separate points in this sequence,
with a tab activation wedged between two of them. `sicht` appears twice, `tabs` four times.

**Why it matters.** Reading all 112 files of `singleSelect` will not tell you that it is called
five times during a restore, in that order, or why. That knowledge exists only in a core service's
phase enum and three effect files. This is the concrete mechanism behind the low explainability
scores: the module boundary is real for *code* but not for *behaviour*, and nothing inside a module
points outward to the sequence that drives it.

**Recommendation (cheap).** One `architecture/restoreSequence.md` — the 31 phases, the owner per
phase, and one line per phase saying why it sits where it does — plus a one-line pointer comment
at the top of each participating owner's `actions/parameterSet/` entry point ("this module is
phase 12, 15, 17 and 21 of the restore sequence; see architecture/restoreSequence.md"). Zero
behaviour change; it converts the single hardest thing in the codebase from tribal knowledge into
a document. This is the highest-value document that does not exist.

---

### F6 — The de-duplication fix landed in the wrong layer — **P1**

WP3 of the consolidation programme extracted the shared tabMutation run/snapshot logic to
`KDB3/js/core/utils/filters/tabMutationRun/` (`guardTabMutationRun.js`,
`tabMutationSnapshots.js`, `listAffectedPlanSlots.js`), and WP6 wrapped `nativeMultiSelect` onto
it. The consolidation itself was right. The destination was not: `core/utils` is declared as pure,
dependency-free helpers, and now holds a stateful run/snapshot engine for one specific protocol,
under a `filters/` subfolder that names a feature family.

A round-1 deep read of `core/properties + core/utils` reached the same conclusion independently and
scored `core/utils` `boundaries: 2`, characterising it as "a folder, not a block — a bag whose real
reuse happens through deep imports the published surface never mentions" (12 of its helpers are
published on `_KDB.utils`; `tabMutationRun` is not).

**Recommendation (cheap).** Move `core/utils/filters/tabMutationRun/` to a named owner — either
`core/services/tabMutationRun/` with an `ensureRuntime` and a contract, or into `dashboard/tabs/`
next to the saga it serves. Also replace its `guardRun`/`isStale` option bag
(`pinOperationId`, `ensureRunIdDefault0`, `staleMode`) with named exported policies, since those
three booleans encode "the dienststelle way" vs "the nativeMultiSelect way" and that is knowledge,
not configuration.

---

### F7 — The documented communication model is not the real one — **P0 (comprehension)**

| | Real usage | Documentation |
|---|---:|---|
| Event bus `_KDB.events` | **10 emit sites** (6 distinct events), ~11 subscribers, 5 files touch it | `architecture/eventSubscribe.md`, **256 lines**, presented as the canonical inter-module mechanism |
| Dispatch `_KDB.api.X.dispatch(...)` | **108 distinct cross-module action types**, 22 owners | **no catalog anywhere** |

The bus catalog is also partly fictional: it documents `tabs:toolRequested`, which exists only as
an unused constant at `dashboard/canvas/kdbControl/events/eventNames.js:27` with
`Subscribers: (placeholder) — file: TBD`, and several entries point at a `TEST/` sandbox tree.
`kdbControl/events/eventNames.js` itself holds 17 *dispatch action types* alongside 6 bus event
names its own header comment admits have no emitters. Two `events/eventNames.js` files
(`widgetDataTable`, `widgetSettings`) contain no strings at all.

Action types are declared under three conventions: `config/actions.js` (6 filter modules),
`config/actionTypes.js` (7 widget/tabs modules), and `events/eventNames.js` (kdbControl).

**Why it matters.** A newcomer who reads the architecture docs learns the wrong mechanism, then
finds the 256-line catalog describes six real events while the 108 action types that actually
carry the system have no index. This is the largest single doc-to-code divergence found.

**Recommendation (cheap — a generated file).** Generate `architecture/actionCatalog.md` from
`grep -rhoE 'type: *"[a-zA-Z]+/[a-zA-Z/]+"'` (command in A.12) — owner, type, declaring file,
dispatchers. Then cut `eventSubscribe.md` down to the six events that exist and retitle it so it
no longer claims to be the inter-module model. Delete the two empty `eventNames.js` files and the
dead constants.

---

### F8 — The on-ramp gap: the cheap documents were the ones not written — **P0 (comprehension)**

The 2026-08-16 readability proposal ranked five cheap living indexes as its highest-value
additions (§6.3). Four were never created:

| Recommended | Status |
|---|---|
| `architecture/jsModuleMap.md` | **missing** |
| `architecture/domainGlossary.md` | **missing** |
| `architecture/userFlows.md` | **missing** |
| `contracts/INDEX.md` | **missing** |
| three sentences in `projectStructureRules.md` | done |

Meanwhile every expensive rename/split tranche R0–R6 plus T3 from the same programme was executed.
The pattern is consistent and worth naming: **this project reliably completes mechanical work and
reliably skips explanatory work.**

The in-code side matches. Only 297 of 1509 files carry any `//` comment; 1413 comment lines total,
~1.5% density. There are 996 `catch` blocks and 1011 `console.error`/`warn` calls — the codebase
is far more invested in reporting failure than in explaining intent.

The cost is concrete. From the `kdbControl` deep read: one settings field — the comment background
colour — carries **five different names** across five files with no map anywhere in code
(`commentBg` as DOM id at `framework/fillCommentSettings.js:12`;
`settings.defaultsNew.comment.backgroundColor` in state at `state/initialState.js:66`;
`{field:"backgroundColor"}` in the action at `settings/bindSettingsForm.js:76-80`;
`defaults.textBackgroundColor` in history; a fifth in the v3 writeback key). The same 12-entry
input-id table is hand-copied into three files where it serves three *different* purposes
(allow-list, ignore-list, sync-list). And `state/selectors.js` — documented in
`contracts/kdbControl.md` §5 as the read contract — has **zero importers repo-wide**, while five
foreign files hand-walk the raw state instead.

**Recommendation (cheap — days, not weeks).** Write the four missing documents. Specifically
`architecture/domainGlossary.md` is load-bearing here: the codebase mixes German domain nouns
(Kennzahl, Dienststelle, Sicht, Steuerung), English technical nouns and Dutch prose, and the German
vocabulary is an *asset* — it is the customer's language — that currently has no definition list.
Add `architecture/restoreSequence.md` from F5 to that set.

---

### F9 — Three `cognos*` folders with three different owners — **P1**

| Folder | Files/lines | Actual job |
|---|---|---|
| `core/cognosAPI` | 23 / 1101 | SDK phrasebook — one `__getDashboardAPI()` chain per method, returns live handles, throws |
| `core/cognosHost` | 9 / 540 | DOM chrome selectors |
| `core/services/cognosHost` | 115 / 5274 | The hardened layer features actually call — flat DTOs, never throws, returns an Outcome |

Runtime mirrors the collision: `_KDB.runtime.cognosHost` **and**
`_KDB.runtime.cognosHostService`. The only place the split is written down is a contract header
(`contracts/cognosHostService.md` D1) explaining the *filename* was chosen "to keep it distinct
from the existing chrome layer" — the disambiguation lives in a doc, not the tree. Dependencies
point both ways: `core/cognosAPI/widgets.js:1` imports from `core/cognosHost`, while
`core/services/cognosHost/facets/tabs/resolveTabsHostApi.js:12` imports back from `core/cognosAPI`.

`core/cognosAPI` also holds ~250 of its 1101 lines of code that touch no SDK at all — the whole
`dashboard/` subtree (`resolveCaptureRoot.js`, `queryIdentityNodes.js`, `selectIdentityNodes.js`,
`matchIdentityNode.js`, `proveActiveScope.js`, `proveScopeResolution.js`, …, 240 lines, zero
`__getDashboardAPI` calls) plus the focus-mode chrome clicks at `widgets.js:64-113`.

Two further self-inconsistencies inside `cognosAPI`: `widgets.getContentPropertyValue(_propertyName, _widgetId)`
(`widgets.js:37`) and `visualization.getContentPropertyValue(_widgetId, _propertyName)`
(`visualization.js:53`) are the same host chain with **reversed arguments**, and the wrong call
returns `undefined` silently rather than erroring. All ten controllers take a `_KDB` parameter that
none of them uses — the real dependency is the undeclared global `__getDashboardAPI`, which has
**no definition, shim or declaration anywhere in the repo** and not one null check across its 71
call sites.

**Recommendation (medium).** Make `core/cognosAPI` mean one thing: move the non-SDK DOM code into
`core/cognosHost` (which already owns chrome selectors and already supplies the selectors those
files import), and rename `core/cognosAPI` → `core/cognosSdk`. Then the division of labour is one
sentence a newcomer can hold: *cognosHost = the DOM, cognosSdk = the SDK,
services/cognosHost = the only thing features call.* Separately, add one comment at the top of
`core/cognosAPI` stating where `__getDashboardAPI` comes from and when it becomes available.

---

## 5. Per-module verdicts

Deep-read blocks, scored 1–5. `explainability: 5` = a newcomer could be walked through it in
20 minutes and then work safely in it.

| Block | Boundaries | Clarity | Maint. | **Explain.** | Verdict |
|---|:--:|:--:|:--:|:--:|---|
| `core/services/tableData` | 4 | 3 | 3 | **3** | mostly-crisp |
| `core/services/widgetBindingPlan` + `Apply` | 4 | 3 | 3 | **2** | mostly-crisp |
| `dashboard/canvas/kdbControl` | 3 | 2 | 2 | **2** | blurry |
| `core/cognosAPI` | 2 | 3 | 3 | **2** | blurry |
| `dashboard/canvas/dragDrop` | 2 | 3 | 3 | **3** | blurry |
| `core/properties` + `core/utils` | 2 | 3 | 3 | **3** | blurry |

**The pattern in this table is the review's central result.** Explainability never exceeds 3 and
averages 2.5 — lower than every other axis. Boundaries and clarity vary by block; explainability
is uniformly the worst. That is a *systemic* property, and F5/F7/F8 are its causes.

A further Opus pass covering the remaining fourteen blocks (`bootstrap`, `config`,
`cognosHostService`, `writeback`, `historyService`, `smallServices`, `tabs`, `filterDock`,
`singleSelect`, `otherFilters`, `widgetBase`, `widgetVis`+`widgetSettings`, `smallWidgets`,
`chrome`) and five further lenses was in flight at the time of writing; §5 should be extended with
its results. The findings above do not depend on it — F1–F6 rest on the lead's own traces.

---

## 6. What NOT to do

Explicit, because three of these would be actively harmful.

1. **Do not build a generic saga framework.** The abstraction already exists
   (`dispatchOwnerPhase.js`) and is good. Propagate it; do not replace it.
2. **Do not merge the restore and seed pipelines.** WP5 investigated exactly this and declined on
   five documented behavioural differences. That decision was correct and should stay recorded.
3. **Do not de-duplicate the per-owner `parameterSet`/`tabMutation` handlers into one shared
   implementation.** Owners genuinely restore differently. The repetition is autarky, not
   accident — the consolidation programme already extracted the parts that *were* shared and
   correctly stopped there.
4. **Do not start another rename tranche.** The naming programme is done and the remaining
   `handle*.js` files are deliberately grandfathered. Renaming is the kind of work this project
   already does well and does not need more of.
5. **Do not split any more files.** 707 of 1509 files are already under 50 lines. Further
   fragmentation makes F5 worse, not better.

---

## 7. Recommendations, prioritised

Cost classes: **cheap** = hours to two days; **medium** = one to two weeks; **project** = larger.

| # | Action | Cost | Fixes | Behaviour change |
|---|---|---|---|---|
| 1 | `tabs/config/tabMutationOwners.js` — one frozen source for the 7 duplicated owner lists | cheap | F2 | none |
| 2 | Generate `architecture/actionCatalog.md` (108 action types); shrink `eventSubscribe.md` to the 6 real events; delete dead constants and the 2 empty `eventNames.js` | cheap | F7 | none |
| 3 | Write `architecture/restoreSequence.md` + one pointer comment per participating owner | cheap | F5 | none |
| 4 | Write the four missing on-ramp docs (`jsModuleMap`, `domainGlossary`, `userFlows`, `contracts/INDEX`) | cheap | F8 | none |
| 5 | Move `core/utils/filters/tabMutationRun/` to a named owner; name its three policy booleans | cheap | F6 | none |
| 6 | `kdbControl/config/controlDefinitions.js` — one row per settings field (id, kind, state path, action, history target, v3 key), extending the existing catalog at `actions/buildParameterSetRestoreActions.js:12-27` | medium | F8 | none |
| 7 | Give `singleSelect` an owner route table modelled on `filterDock/config/ownerRoutes.js`; drop the false generality | medium | F1, F3 | none |
| 8 | Relabel the layer that `writeback` lives in — new `app/` ring, or an explicit named exception in `projectStructureRules.md` | medium | F4 | none |
| 9 | Split non-SDK DOM code out of `core/cognosAPI`; rename it `core/cognosSdk`; document `__getDashboardAPI` | medium | F9 | none |

Items 1–5 are the recommended first tranche: roughly one focused week, no behaviour change, and
they address the axis that scored worst. Note that **six of the nine are documentation or a
single config file** — which is the honest shape of this codebase's remaining debt.

---

## 8. Open questions for the PO

1. **Is `writeback` allowed to be the application layer?** If yes, the ring model should say so
   (rec. 8). If no, this is a real project, not a relabel. This is the only genuinely
   architectural decision in this report.
2. **Is the German domain vocabulary intended to be the canonical vocabulary?** If yes, a glossary
   is load-bearing, not optional. If it is being migrated to English, that should be stated before
   more code is written either way.
3. **`allowDeprecatedScopeProjection`** is `true` for `specialSingleSelect`, `sicht` and
   `dienststelle`, `false` for `singleSelect` and `nativeMultiSelect`
   (`filterDock/config/ownerRoutes.js`). This flag is a migration ledger frozen in config. Is the
   migration still intended, and who owns finishing it?
4. **`_KDB.data`** is declared at `KDB.js:267` with zero readers or writers. Reserved for
   something, or deletable?
5. **Does `specialSingleSelect` still need to exist as a separate module** (35 files, 2425 lines),
   or is it a variant of `singleSelect`? It participates in neither tabMutation nor parameterSet
   restore under its own name and appears in `singleSelect` as a hardcoded owner name.

---

## 9. Honest counter-position

The strongest case against this report:

Every finding above except F2 and F3 is a **labelling or documentation** finding. The mechanisms
are sound, the boundaries mostly hold, the state model is real, the file-size and naming
programmes were completed, and the team has demonstrated it declines bad abstractions on evidence
(WP5). One could reasonably argue that a codebase whose worst problem is that its best
infrastructure is filed under a misleading folder name is in good shape, and that the
explainability scores measure the *absence of documents* rather than a defect in the design.

That argument is largely correct, and it is why §6 is as long as it is. The reason the report still
leads with explainability is that this codebase is a **long-lived product with a small team and a
vendor host**, where the cost of "only two people can safely change the restore sequence" is not
theoretical. The four missing documents were identified as the highest-value items nine days ago by
a different reviewer and were not written, while the expensive mechanical work was. That asymmetry,
not any individual finding, is the thing worth changing.

---

## Appendix A — Method and measurements

All figures measured against the working tree on branch `audit`, HEAD `fcb8dbf`, 2026-08-25.
Reproduction commands in A.12.

### A.1 Size and shape

| Measure | Value |
|---|---:|
| JS files under `KDB3/js`, excluding `core/libraries/` | 1509 |
| Lines, same scope | ~93 000 |
| Mean file size | ~62 lines |
| Files ≤ 20 lines | 223 |
| Files 21–50 | 484 |
| Files 51–80 | 344 |
| Files 81–120 | 299 |
| Files 121–150 | 138 |
| Files 151–250 | 12 |
| Files > 250 | 9 (7 of them `core/config` data tables) |

Non-config files above 250 lines: `kdbControl/framework/buildControlPrimitiveGallery.js` (715,
PO-locked), `KDB.js` (398, approved exception),
`core/services/historyService/createHistoryService.js` (256).

### A.2 Lines per block

| Block | Files | Lines |
|---|---:|---:|
| `dashboard/filters` | 401 | 27 367 |
| `core/services` | 366 | 21 525 |
| `dashboard/widgets` | 342 | 21 190 |
| `dashboard/tabs` | 98 | 6 351 |
| `dashboard/canvas` | 97 | 6 313 |
| `core/config` | 24 | 6 085 |
| `dashboard/launchpad` | 25 | 1 596 |
| `dashboard/metricsTree` | 20 | 1 468 |
| `dashboard/header` | 23 | 1 341 |
| `dashboard/controls` | 23 | 1 100 |
| `core/cognosAPI` | 23 | 1 101 |
| `dashboard/footer` | 17 | 660 |
| `core/utils` | 15 | 667 |
| `core/properties` | 13 | 544 |
| `core/cognosHost` | 9 | 540 |

`core/services`: `writeback` 80/6246, `cognosHost` 115/5274, `widgetBindingApply` 36/2447,
`widgetBindingPlan` 33/1761, `tableData` 36/1688, `dashboardPdf` 23/1670, `messageService` 17/1026,
`historyService` 12/740, `loadingService` 12/488.

`dashboard/filters`: `singleSelect` 112/8324, `dienststelle` 85/5842, `filterDock` 71/4514,
`sicht` 54/3573, `nativeMultiSelect` 44/2689, `specialSingleSelect` 35/2425.

`dashboard/widgets`: `widgetVis` 94/6259, `widgetBase` 89/5590, `widgetSettings` 76/4652,
`widgetText` 43/2342, `widgetTopN` 30/2138, `widgetDataTable` 10/209.

### A.3 Communication model

| Mechanism | Real usage |
|---|---|
| Bus emit sites | 10 (6 distinct events) |
| Bus subscribers | ~11 |
| Files touching `_KDB.events` | 5 |
| Distinct cross-module action types | **108** |
| Files declaring them | 13, under 3 filename conventions |
| Central catalog of the 108 | **none** |
| Catalog of the 6 bus events | 256 lines |

The ten emit sites in full:

```
core/authoring/effects/publishAuthoringFacts.js:10,12        authoring:entered / :exited
core/services/historyService/effects/emitHistoryChanged.js:12 history:changed
core/services/tableData/operations/runLoadTableWork.js:85,91  tableData:loadFinished / loadFailed
dashboard/canvas/dragDrop/dropboxes/publishValidatedDrop.js:41 canvas:dropValidated
dashboard/header/effects/__orchestratorHeaderEffects.js:79     header:confirmedChanged
dashboard/tabs/actions/postParameterSetRestoreTraverse.js:76   tabs:changed
dashboard/tabs/actions/runTabMutationOwnerPhases.js:115        tabs:changed
dashboard/tabs/effects/observeActiveTab.js:57                  tabs:changed
```

Action types per owner: `widgetBase` 15, `tabs` 14, `widgetVis` 7, `singleSelect` 7, `widgetText` 6,
`launchpad` 6, `header` 6, `dragDrop` 6, `metricsTree` 5, `history` 5, `widgetSettings` 4, `sicht` 4,
`nativeMultiSelect` 4, `footer` 4, `dienststelle` 4, `widgetTopN` 3, `specialSingleSelect` 3,
`filterDock` 2, `widgetDataTable` 1, `kdbControl` 1, `comments` 1.

### A.4 Cross-cutting reach

| Protocol | Files | Modules |
|---|---:|---|
| history replay | 154 | ~15 |
| parameterSet restore | 123 | 14 |
| tabMutation | 90 | ~8 |
| filterInstanceIdentity | 36 | 7 |

parameterSet per participant: `writeback` 18, `tabs` 19, `singleSelect` 20, `nativeMultiSelect` 12,
`widgetBase` 10, `dienststelle` 9, `sicht` 9, `widgetVis` 8, `widgetText` 5, `widgetSettings` 4,
`kdbControl` 4, `header` 2, `footer` 2.

Contract deltas, one per participant per protocol: 13 × `*-parameterSetRestore-contractdelta.md`,
7 × `*-filterInstanceIdentity-contractdelta.md`, 4 × `*-tabMutation-contractdelta.md`,
12 × `writeback-*`, 10 × `*history*`.

tabMutation participation verified in code: `singleSelect` 10 files under `actions/tabMutation/`,
`dienststelle` 10, `nativeMultiSelect` 11, `widgetBase` 4 handler files; `sicht`,
`specialSingleSelect`, `filterDock` zero.

### A.5 Layering

The 13 `core/` → `dashboard/` static imports, all in `core/services/writeback`:

```
get/collectors/buildWidgetObject.js:3              -> widgets/widgetSettings/config/dropdownDefaults.js
get/collectors/collectCanvasSettings.js:3          -> canvas/kdbControl/state/initialState.js
get/collectors/collectTabs.js:3,4                  -> tabs/config/defaults.js, tabs/state/selectors.js
get/collectors/collectWidgets.js:3,4,5,6           -> tabs/config/actionTypes.js, tabs/config/defaults.js,
                                                      widgets/widgetBase/view/resolveWidgetShell.js,
                                                      widgets/widgetBase/history/resolveCanvasLayoutFromFrame.js
get/collectors/singleSelectCollectorInventory.js:3 -> filters/singleSelect/state/selectors.js
get/collectors/singleSelectCollectorScope.js:3     -> tabs/state/selectors.js
map/adapters/mapV2TxtWidget.js:2                   -> widgets/widgetSettings/config/dropdownDefaults.js
map/adapters/mapV2VisWidget.js:2                   -> widgets/widgetSettings/config/dropdownDefaults.js
set/effects/filterRestoreGeneration.js:4           -> filters/singleSelect/state/selectors.js
```

Confirmed module-level cycles:

| Cycle | Evidence |
|---|---|
| `writeback` ↔ `widgetBase` | `writeback/get/collectors/collectWidgets.js:5-6` ↔ `widgetBase/actions/serializeWidgetFrame.js:2`, `widgetBase/effects/fillDuplicateWidgetContent.js:5` |
| `sicht` ↔ `singleSelect` | 6 files in `sicht/` import `singleSelect/state/selectors.js` ↔ `singleSelect/actions/parameterSet/parameterSetResyncApply.js:6` |
| `header` ↔ `footer` | `header/effects/__orchestratorHeaderEffects.js:6` ↔ `footer/state/selectors.js:1`, `footer/events/eventNames.js:1` |

19 files under `core/` reference `_KDB.api.<featureModule>` by name; 25 files under `core/` are
*named* after a dashboard feature. 19 of the 31 restore phase names name a feature module.

### A.6 The shared context object

| Namespace | Files reaching it |
|---|---:|
| `_KDB.runtime.*` | 239 |
| `_KDB.state.*` | 172 |
| `_KDB.api.*` | 115 |
| `_KDB.services.*` | 81 |
| `_KDB.elements.*` | 64 |
| `_KDB.config.*` | 30 |
| `_KDB.cognosAPI.*` | 15 |
| `_KDB.properties.*` | 14 |
| `_KDB.utils.*` | 11 |
| `_KDB.events.*` | 5 |
| `_KDB.data.*` | **0** |

146 files that are neither an `__orchestrator*` nor a `create*Controller` reach `_KDB.services.*`
or `_KDB.api.*` directly, against the project's own Dependency Injection rule. Depth-6 examples:
`writeback/get/collectors/*.js`, `writeback/set/effects/*.js`,
`widgetVis/effects/gates/topNGate.js`,
`nativeMultiSelect/actions/tabMutation/guardTabMutation.js`.

### A.7 State and runtime ownership

`_KDB.state` write sites by subtree: `filters` 185, `widgets` 88, `kdbControl` 30, `header` 29,
`tabs` 24, `tableData` 24, `footer` 16, `dragDrop` 13, `launchpad` 11, `loading` 9, `metricsTree` 8,
`authoring` 8, `kennzahlenSource` 6, `history` 6, `rootLifecycle` 1.

`state.filters` and `state.widgets` are the two family containers with several writer modules each.
`_KDB.runtime` has ~30 owners, one per module, except the pair `_KDB.runtime.cognosHost` /
`_KDB.runtime.cognosHostService`.

### A.8 In-code documentation and defensiveness

| Measure | Value |
|---|---:|
| Files with any `//` comment | 297 / 1509 (20%) |
| Total `//` comment lines | 1413 (~1.5%) |
| Files with a `/* */` block | 28 |
| Files containing `try {` | 627 (42%) |
| `catch` blocks | 996 |
| `console.error` | 805 |
| `console.warn` | 206 |
| `console.log` | 5 |

### A.9 Naming debt

| Pattern | 2026-08-16 | Now |
|---|---:|---:|
| `*Support.js` | 18 | **8** |
| `*Shared.js` | 4 | **2** |
| `*Internals.js` | 2 | **0** |
| `maybePush*.js` | 7 | **0** |
| `stage*HistoryReplayHandler.js` | 11 | **0** |
| `manage*.js` | 7 | **4** |
| `handle*.js` | 61 | 61 (grandfathered) |

`function __controller` appears in 395 of 1509 files (26%).

### A.10 On-ramp documents

See F8. Four of five recommended indexes never created; all expensive tranches executed.

### A.11 Lifecycle registry completeness

`registerFeatureModules` registers 21 orchestrators; `mountFeatureModules` mounts the same 21;
`destroyRegisteredFeatures` lists 22 (the 21 plus `authoring`, registered in `setupCoreFactories`
and never mounted). **The destroy registry is complete today.** It is also entirely
hand-maintained: nothing derives it and nothing fails if a future module is added to the mount list
and forgotten in the destroy list.

### A.12 Reproduction

```bash
# sizes
find KDB3/js -name '*.js' -not -path '*/libraries/*' -print0 | xargs -0 wc -l | sort -rn

# event bus reality
grep -rn '\.emit(' KDB3/js --include=*.js
grep -rn 'events\.subscribe(' KDB3/js --include=*.js

# the real protocol — 108 action types
grep -rhoE 'type: *"[a-zA-Z]+/[a-zA-Z/]+"' KDB3/js --include=*.js --exclude-dir=libraries \
  | sed 's/type: *//' | tr -d '"' | sort -u

# layer inversion
grep -rn '"\.\..*dashboard/' KDB3/js/core --include=*.js

# service-locator reach outside orchestrators/controllers
grep -rl '_KDB\.\(services\|api\)\.' KDB3/js --include=*.js \
  | grep -v '__orchestrator' | grep -v 'Controller\.js' | wc -l

# cross-cutting reach
for c in parameterSet tabMutation replay inventoryGeneration; do
  echo -n "$c: "; grep -rli "$c" KDB3/js --include=*.js | wc -l; done

# the seven duplicated tabMutation owner lists
grep -n 'widgetBase", "singleSelect\|"singleSelect", "dienststelle' \
  KDB3/js/dashboard/tabs/actions/runTabMutationSaga.js \
  KDB3/js/dashboard/tabs/effects/clearTabMutationSnapshots.js

# singleSelect's hardcoded owner names
grep -rn '"sicht"' KDB3/js/dashboard/filters/singleSelect --include=*.js
```
