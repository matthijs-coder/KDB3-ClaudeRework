# Backlog: `filters/pageContextPlain` — owner voor kale page-context-filters

Status: PO-akkoord optie A (2026-08-12). **P0 live** — Cognos smoketests groen 2026-08-14
(incl. dest-item skip); committed. **P1 implemented 2026-08-14** — Composer build + review clean; planner final review accept.
Awaiting PO Cognos smoketest (GET/SET `filt.pcfs`).

Snapshot per item: `{ itemId, itemName, sourceId, values: [{ d, u }] }` keyed under
`byScope[scopeId]` (scopeId is the map key, not a field on the item).

Saga-wiring: add `pageContextPlain` to prepare, filterApply, **all three hardcoded
rollback sites**, and hostResync in `runTabMutationSaga.js`, plus
`dispatchOwnerTabMutation.buildOwnerPayload`.

## Aanleiding (pariteitsregressie, geen nice-to-have)

Legacy KDB2 ondersteunde kale page-context-filters (door de gebruiker
toegevoegde Cognos-filters zonder KDB-config, multi-select) volledig:
- GET serialiseerde álle `getPageContextItemsArr()`-items per tab
  (`wbParameterGetTabsHelpers.js` r36-58) in `pageContextFilterObjArr`.
- SET restaureerde ze generiek via `updateFilterContext` replace
  (`wbParameterSetFiltersHelpers.js` r206-276).
- Tab-CRUD permuteerde de array mee (move r1118-1166, duplicate r762-763,
  delete r521-528 in `configurationToolboxHelpers.js`).

KDB3 doet er niets mee:
- Classificatie: items zonder `filterPropObj`-config of met
  `isSingleSelect: false` → `unknown`, alleen `HOST_ITEM_UNKNOWN`-diagnostic
  (`classifyFilterInstance.js` r29-46, `enumerateFilterInstances.js` r95-101).
- Writeback v3 heeft geen bucket (writeback.md §4.3; pariteittabel:
  "unsupported tranche 1").
- Tab-mutaties: ownerset is widgetBase/singleSelect/dienststelle — kale
  filterwaarden blijven aan het fysieke slot kleven bij delete/move/duplicate.

## Besloten oplossing (optie A)

Nieuwe kleine sub-owner `_KDB.state.filters.pageContextPlain`:
- Enumereert host-items die geen bestaande owner claimt (complement van de
  singleSelect/dienststelle/sicht/specialSingleSelect-classificatie).
- Snapshotvorm per item: `{ itemId, itemName, sourceId, scopeId, values[] }`
  (multi-value; geen Alle-/useValue-model).
- Tab-mutatie-handlers naar dienststelle-patroon: prepare (snapshot) /
  applyTabMutation (snapshot-sourced shift + clone, clears bij delete) /
  restoreTabMutationSnapshot / resyncTabMutationHost (live lookup per call,
  géén reconcile nodig — zelfde eigenschap als dienststelle).
- ScopeId-resolutie uitsluitend via `tabs/resolveFilterScopeTargets`.
- Saga-wiring: owner toevoegen aan de drie ownerlijsten in
  `runTabMutationSaga.js` (prepare r28, filterApply r31, hostResync r43).
- Host-primitieven bestaan al: `getPageContextItemsArr(true)`,
  `getFilterValues`, `replaceFilterContext`.

Tranche-indeling:
1. Tranche P0: tab-mutatie-pariteit (bovenstaande). Eigen contractdelta
   (`pageContextPlain-tabMutation-contractdelta.md`) + stateOwnership-entry
   vereist vóór bouw; cross-review door tabs- én writeback-spoor.
2. Tranche P1 (apart PO-besluit): writeback GET/SET-serialisatie — nieuwe
   `filt`-bucket in v3 (bijv. `filt.pcfs[]`), schema-uitbreiding in
   writeback.md §4.3 + collectors + restore-fase.

Geschat: P0 ±3-4 dagen, P1 ±3-4 dagen.

## Bekende beperking tot die tijd

Bij delete/move/duplicate blijven kale page-filterwaarden op het fysieke slot
staan (semantische mismatch na mutatie); ze gaan niet mee in opgeslagen
parameterSets. Geaccepteerd door PO op 2026-08-12 als tijdelijke, bekende
beperking; tranche-3-spec verwijst hiernaar onder Open items.
