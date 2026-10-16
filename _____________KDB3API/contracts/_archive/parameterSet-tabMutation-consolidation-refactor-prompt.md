# REFACTOR-PROMPT — consolidatie parameterSet-/tabMutation-code (filters + widgets)

Status: backlog, PO-akkoord voor uitvoering vereist. Vastgelegd 2026-08-12.
Bron: read-only inventarisatie van 2026-08-12 (twee subagents) over
`singleSelect`, `dienststelle`, `sicht`, `widgetBase`, `widgetVis`,
`widgetText`, `widgetSettings`.

Onderstaande prompt is bedoeld om integraal aan een hoog-niveau agent te
geven zodra de tab-CRUD-tranches (delete/move/duplicate) live gesmoketest en
gecommit zijn. NIET starten zolang er ongecommit werk in die paden staat.

---

## PROMPT

COMPLEXE TAAK — KDB3 consolidatie-refactor: parameterSet- en tabMutation-code
in filter- en widgetmodules. Gedragsneutraal: geen enkele zichtbare of
contractuele gedragswijziging. Behandel als hoogcomplex, multi-file, strikte
rule-alignment.

Project root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`
Doelproject: `_____________KDB3API/` (owners onder `KDB3/js/dashboard/`,
services onder `KDB3/js/core/services/`). Legacy READ-ONLY, `TEST/` niet
aanraken, niets onder `.cursor/rules/` of authority-docs wijzigen zonder
akkoord.

AUTHORITY: `contracts/writeback.md` (hoofdcontract),
`contracts/tabs-tabCrud-contractdelta.md`, de per-owner
`*-parameterSetRestore-` en `*-tabMutation-contractdeltas`, en
`architecture/projectStructureRules.md` + `architecture/stateOwnership.md`.
Module Contract First: wijzigt een bestandslijst of een intern mechanisme dat
in een contract beschreven staat, dan het contract in dezelfde stap bijwerken
(as-built-notitie, gedateerd). File-limits: 150 regels JS-executables, 120
orchestrators. Geen nieuwe events, geen foreign state writes, geen nieuwe
top-level `_KDB.*`.

VOORAF (verplichte nulmeting): draai per te wijzigen module een read-only
scan (subagent) die de huidige call-graph van de te consolideren bestanden
vastlegt (wie importeert wat, file:line). Elke consolidatiestap eindigt met
een diff-walk tegen die nulmeting: zelfde callers, zelfde returnshapes,
zelfde diagnostics-codes.

### Werkpakketten (in deze volgorde, elk met eigen STOP/PO-gate)

WP0 — DONE 2026-08-16: deleted dead `annotatePageContextCollisions.js` (zero importers). `singleSelect-tabMutation-contractdelta.md` §3 restated without file cite; §5.3 instance-aware `semanticInstanceKey` remains the governing collision discipline.

WP1 — DONE 2026-08-16: singleSelect parameterSet-runtimecluster consolidated to 5 files under `singleSelect/actions/`:
- `parameterSetRuntime.js` (guardRun / generation-pinning helpers inlined; re-exports writeback guards),
  `parameterSetRuntimeRegistry.js`, `parameterSetWritebackGenerationGuards.js`,
  `parameterSetResyncApply.js` (resync support inlined), `parameterSetResyncApplyPair.js`.
- Publieke aanroepers die identiek moeten blijven werken:
  `handleParameterSetClear/Restore/Resync/RunFinished`,
  `routeParameterSetIdentityAction`, en het writebackSet-pad (stap 18-22 van
  §6.4 writeback.md). Diagnostics-codes uit `parameterSetCodes.js` ongewijzigd.

WP2 — DONE 2026-08-16: Cognos-schrijfprimitieven singleSelect geconsolideerd.
- Nieuw: `effects/writeVerifiedSelection.js` (replace + verify + rollback;
  opties `expected`, `verifyRollback`).
- `effects/writeAndVerifyInstanceSelection.js` blijft de tabMutation/history
  wrapper (publieke signatuur `{ ok, errorCode }` ongewijzigd); roept het
  primitief met `verifyRollback: false`.
- `actions/applyOwnerSelection.js` roept het primitief met `verifyRollback:
  true`; `ownerSelectionSupport.js` ongewijzigd (notify-fail rollback).
- `effects/replayCommittedSelectionWrites.js` ongewijzigd (unavailable-replay
  blijft PATH2-lokaal; normaal pad blijft PATH1-wrapper).
- WP3+ onaangeroerd.

WP3 — DONE 2026-08-16: shared tabMutationRun library for singleSelect + dienststelle.
- **Path:** `KDB3/js/core/utils/filters/tabMutationRun/` (`guardTabMutationRun.js`, `tabMutationSnapshots.js`, `listAffectedPlanSlots.js`).
- Stateless AMD only; not registered on `_KDB.utils` / api / services / runtime; not added to `core/utils/__orchestratorUtils.js`.
- Owners delegate guard/stale/cancelled (and dienststelle snapshot + listAffectedSlots); scope resolution, instance matching, host writes, and owner state remain owner-eigen.
- SS vs DS guard/stale asymmetries preserved (SS pins `tabMutationOperationId`; DS `ensureRunIdDefault0` + exact runId equality stale + runIds on cancelled diagnostics).
- `nativeMultiSelect`, `widgetBase`, `buildTabMutationTransfers.js` untouched. WP4+ onaangeroerd.

WP4 — DONE 2026-08-16: widgets content-create-dispatch samenvoegen.
- **Shared:** `widgetBase/effects/dispatchContentCreateShared.js` (`resolveMetricByCode`, content-owner API lookup by kind, `dispatchContentAction`).
- **Wrappers unchanged (public import paths):** `dispatchContentCreate.js` (drop: text/vis/datatable/topN, drag fallbacks, `{ ok, errorCode, errorMessage, result? }`) en `dispatchRestoreContentCreate.js` (restore: vis+text only, `widget.code` only, restore flags, `{ ok, message?, diagnostics?, degraded? }`).
- Geen mega-dispatcher; drop/restore payload- en return-shape verschillen expliciet gebleven.
- Contracts as-built bijgewerkt (`widgetBase.md`, `widgetBase-parameterSetRestore-contractdelta.md`, `metricsTree-resolveMetricByCode-contractdelta.md`). WP5+ onaangeroerd.

WP5 — NOT MERGED 2026-08-16: restore-batch stays on `parameterSetRestoreBatchCommits.js`; seed stays on `handleSeedDefaults` / `applyVisStartupSeedBatch`. Gate not met (batch order + per-widget diagnostics would change).

Diff-walk 2026-08-16: pipelines are not the same — do not route restore through seed. Why merge would change behaviour:

1. Order: restore vis commits type/dim/topn then colour; seed colour first then singles then vis batch.
2. Commit vs dispatch: restore commit-then-consequence; seed dispatch-then-commit.
3. Fail-fast `WRITEBACK_WIDGET_RESTORE_FAILED` vs collect diagnostics + `WIDGET_SETTINGS_*` / deferred.
4. Restore has runId stale-cancel; seed has pendingPromises + readiness.
5. Restore always commits defaults for missing keys; seed only applies collected startup defaults.

Shared overlap only: `commitWidgetSettingValue` (no ≥15-line byte-identical helper between restore and seed).

WP6 — DONE 2026-08-16: `nativeMultiSelect` tabMutationRun wrap + owner-local `stripTabpanel`.
- **New:** `nativeMultiSelect/effects/stripTabpanel.js` (owner-local; not registered on `_KDB.utils` / api / services / runtime).
- **Wrapped:** `nativeMultiSelect/actions/tabMutationSupport.js` delegates guard/stale/cancelled, snapshots, and `listAffectedSlots` to shared `tabMutationRun` library (DS-style: `ensureRunIdDefault0`, exact `tabMutationRunId` stale, runIds on cancelled diagnostics, `String(operationId)` snapshots; no `pinOperationId`).
- **Owner-owned:** `resolveScopeIdForSlot` (including global-skip via `stripTabpanel`), `cloneItem`, `cloneValues`, `pushUnique`, `matchLayoutScopeId`, `resolveScopeId`.
- **prepareTabMutation:** local `listAffectedSlots` removed; uses `_support.listAffectedSlots(_plan)`.
- **Folders NOT MOVED:** `actions/` remains flat (no `actions/tabMutation/` or `actions/parameterSet/` subfolders).
- **Lookups NOT MERGED:** `lookupNativeMultiSelectApi` (itemId) and `lookupNativeMultiSelectApiByName` remain separate.

WP7 — CONFIRMED 2026-08-16 (confirm-only; no JS edits): writeback pcfs / nativeMultiSelect pipeline invariants held.
- **Four files exist (unchanged):** `schema/validate/validatePcfs.js`, `schema/normalize/normalizePcfs.js`, `get/collectors/collectNativeMultiSelect.js` (live name; not `collectPageContextPlain`), `set/effects/dispatchFilterClearPhases.js`.
- **Restore order (`runFilterRestore.js`):** `nativeMultiSelectRestore` runs after `singleSelectPageContextRestore`, before `sichtDownstreamVisibility`; `required: true`, no `degradedAllowed`.
- **Clear gating:** nativeMultiSelect clear only when `filt.pcfs !== undefined` (`runFilterRestore.js` passes that as `includeNativeMultiSelect` into `dispatchFilterClearPhases`).
- **`map/adapters/`:** listed in `writeback.md` §1 tree but absent on disk (only `map/createWritebackMapService.js` exists) — out of scope for this refactor; writebackMap product work. Do not invent adapters; do not edit `writeback.md` §1 here.
- WP8 — DONE 2026-08-16: audit of the touched list (26 JS files from WP1–WP3 committed + WP4/WP6 working tree); behaviour-neutral rule pass only; **zero JS changes**.
  - **Residuals left (touched set):** `dienststelle/actions/prepareTabMutation.js` still has no entry `try/catch` (pre-existing); converting throw→`ok:false` would change tabs-saga failure handling, so left as residual. Pre-existing missing `try/catch` on some factory-scope helpers/exports (`parameterSetRuntime.js` guards/cleanup, `dienststelle/tabMutationSupport.js` / `singleSelect/tabMutationSupport.js` scope helpers, `dispatchRestoreContentCreate.js`, `dispatchContentCreateShared.js`, `parameterSetResyncApply.js` pure normalizers); `__controller` export naming debt (`listAffectedPlanSlots.js`, `writeAndVerifyInstanceSelection.js`); `dispatchContentCreate.js` `const`/`let` + `.then(function)` style; `.forEach`/`.map` in clone/snapshot helpers; `parameterSetResyncApplyPair.updateCanonicalInstance` direct instance-field writes (parameterSet resync path, pre-existing); lookup/effect files that convert errors to `null`/`[]`/`false` at boundary (pre-existing).
  - **Known-debt files not in set:** untouched (`createWidgetBaseController`, `createTabsController`, `traverseTabs`, `createDienststelleController`, dienststelle selectors, `createHistoryService`, etc.).

EXPLICIET BUITEN SCOPE: de widgetBase canvas-discovery-stack
(`readCanvasDiscoverySources` / `buildCanvasWidgetDescriptor` /
`discoverCanvasWidgets` / `waitForScopedShells`, ~404 regels). Die is
timing-gevoelig (lazy routing, settle-windows) en recent uitvoerig
gestabiliseerd; niet aanraken in deze refactor.

### Werkwijze / CP-gates
Per werkpakket: read-only scan + nulmeting (subagent, composer 2.5) →
consolidatievoorstel met exacte bestandslijst voor/na → STOP voor PO-akkoord
→ uitvoeren (subagents voor mechanische delen) → ReadLints + regeltellingen →
diff-walk tegen nulmeting → contract-as-built-sync → onafhankelijke
cross-review (ander model) → volgende WP. Na WP3 en na WP5: volledige
Cognos-smoketest door PO (restore van een verse GET-fixture, tabs
delete/move, filterselecties, history-replay) vóór verdergaan.

FORBIDDEN zonder akkoord: gedrag of contracten wijzigen anders dan
as-built-doc-sync; nieuwe events; nieuwe services; legacy bewerken;
diagnostics-codes hernoemen; returnshapes wijzigen.

### Verwachte opbrengst
- singleSelect/actions: van ~3.191 naar ruwweg ~2.400 regels; 7
  parameterSet-runtimebestanden → 3-4; drie schrijfprimitieven → één.
- singleSelect+dienststelle tabMutation: ~1.200 → ~800 regels met gedeelde
  kernel.
- widgetBase: één content-create-dispatcher; widgetSettings: één commit-pad.
- Nul gedragsverschil, aangetoond per diff-walk en smoketest.
