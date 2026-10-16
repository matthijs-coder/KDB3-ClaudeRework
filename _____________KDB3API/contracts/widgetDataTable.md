# Module Contract: `widgetDataTable` — STUB

> STUB only (titles/outline). Full contract written at the start of the `widgetDataTable` tranche per `feature-structure.mdc`. Rationale: `architecture/_archive/widgets-domain-blueprint.md`.

**Status:** `Stub`
**Owner module / service:** `widgetDataTable`
**Type:** `feature module` (content)
**Authoring AI:** Planner (Claude Opus 4.8), 2026-06-06
**Reviewed by:** `<pending full contract>`

## 1. Purpose
Datatable (Cognos "List") content. Mostly passive in this design: routed to the launchpad `dataTables` pad, readable via `tableData`, and claimable as a TopN helper. No user settings/drag product behaviour beyond generic widget lifecycle in this tranche.

## 2. Ownership
- Canonical state subtree: `_KDB.state.widgets.dataTable.byId[widgetId]` (minimal: `pending`, `errorCode`). The widget's frame/identity/`role:"topNHelper"`/`ownerWidgetId` live in `widgetBase`.

## 3. Runtime
- `_KDB.runtime.widgetDataTable[widgetId]`: `abortControllers`, `opSeq`. Cleanup on `destroy`.

## 4. Public API (dispatch-style)
`_KDB.api.widgetDataTable = { mount, destroy, dispatch, getState }`.
Key actions: `contentCreate`, `validateClaimable` (TopN-initiated: confirms this datatable can serve as a helper), `releaseClaim`. Claim flow: `widgetTopN` initiates → `widgetDataTable` validates claimability → `widgetBase` records `role`/`ownerWidgetId`. `widgetDataTable` never writes `widgetBase` state directly (frame-role updates go through `_KDB.api.widgetBase.dispatch`).
Launchpad parking (label streamlining): a standalone datatable parks in the `dataTables` pad (legacy label: `shapes`); a datatable claimed as a topN helper parks in the `topN` pad (legacy label: `dataTables`). Pad classification is owned by `widgetBase`.

## 5. Readers / Writers (outline)
Selector: `readDataTableState(_KDB, id)`.

## 6. Events
None in tranche 1.

## 7. Dependencies
`_KDB`, `_KDB.api.widgetBase` (frame/role updates), `_KDB.services.tableData` (read rows).

## 8. Cognos Touchpoints (outline)
Read-only data access via `tableData`; List rendering managed through the binding services when used as a TopN helper (driven by `widgetTopN`).

## 9. Folder Layout
As built: two files. `index.js` (`registerWidgetDataTable`, the whole module) and `__orchestratorWidgetDataTable.js` (shim over `index.js`, kept for `KDB.js`). There is no `config/`, `state/` or `effects/` folder.

## 10. Out Of Scope
- A first-class interactive grid widget (future extension; not this tranche).
- TopN resolution logic — owner: `widgetTopN`.
- Frame/identity/placement — owner: `widgetBase`.

## 11. Open Questions
- Whether a future first-class grid datatable is planned (would extend this module, not restructure the registry).
