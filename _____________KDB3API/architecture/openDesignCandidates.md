# Open Design Candidates

This file lists architectural ideas that are not yet adopted as canonical rules but may become formal services, modules or patterns when concrete repetition or port-effort proves the need.

Adding an entry here is not a commitment. Promoting an entry to a formal service or rule requires an explicit decision and a module contract per `feature-structure.mdc` (Module Contract First).

Use this file alongside `migrationContext.md` as a long-lived reference; do not use it for short-term implementation notes.

## Adopted / decided (no longer candidates)

| Topic | Decision | Where canonical |
|-------|-----------|-----------------|
| Dashboard-level **authoring** module (split uit `kdbControl`) | **CP-1 approved** 2026-05-13 | `_____________KDB3API/contracts/kdbControl-authoring-mode-contractdelta.md`, `contracts/kdbControl.md` (Q3 superseded), `architecture/stateOwnership.md`, `architecture/eventSubscribe.md` |

## widgetBindingService

Candidate for handling Cognos slot/filter/render-wait mutations as a dedicated shared service.

Notes:

- Candidate responsibility: bind widget slots, apply local filters and wait for render completion against the Cognos host.
- Boundary against `tableDataService`: `tableDataService` stays focused on table-data load/cache/status; `widgetBindingService` would own Cognos-side widget binding only.
- Expected sequential consumer pattern (e.g. Top N pipeline): call `widgetBindingService` to set helper-table slots and await render, then call `tableDataService.reloadTable` for fresh rows (`readRows` remains a pure cache read), then call `widgetBindingService` again for the target widget. Sequencing via `await` / return values; events only as fact notifications, never as flow-control.
- Promotion criteria: do not introduce a definitive service until concrete repetition or port-effort across at least two features makes the need explicit. The first port that proves repetition is the trigger; until then, feature-local orchestration inside the consuming feature is acceptable. Feature-local orchestration must still follow all global rules for ownership, public APIs, state mutations and effects; it is not a license to bypass them.

## controlDefinitions[] data layer

Candidate for a serializable `controlDefinitions[]` data layer that drives the `kdbControl` settings panel UI from declarative data instead of imperative builders.

Notes:

- Current placement: deferred per the Q1 decision in `_____________KDB3API/contracts/kdbControl.md` (recorded 2026-05-12); the skeleton uses no `controlDefinitions[]` and the toolbox plus settings remain imperative builders.
- Reason to consider promotion: serializable definitions enable history-replay, snapshotting, and rule-driven settings tests; imperative builders couple control structure to DOM construction code.
- Candidate responsibility: define a `ControlDefinition` shape (`id`, `kind`, `target`, `label-key`, `enabledWhen`, `options`, etc.); place definitions in `kdbControl/config/controlDefinitions.js`; builders read from definitions and render generic control kinds. Behaviour resolves through named actions, selectors, controller and effects per the original Q1 framing.
- Boundary against current builders: builders move from "construct DOM for control X" to "render any control definition"; settings logic becomes definition-driven.
- Promotion criteria: trigger is the first concrete need for serialisable settings snapshots, history-replay of settings changes, or rule-driven settings tests. Until then, the imperative builders remain.

## hierarchyDataService

Candidate to handle Cognos `visType === "hierarchy"` data loading as a sibling service alongside `tableDataService`.

Notes:

- Current placement: deferred per the Q1 decision in `_____________KDB3API/contracts/tableDataService.md` (recorded 2026-05-12). The first litmustest skeleton handles only list-type tables.
- Reason to consider promotion: hierarchy data shares the legacy `loadTableData` pipeline but stores a different shape (flattened `data` + `semantics`) under `_KDB.data.hierarchies.byHandle` / `byName`. Merging it into `tableDataService` would double its API surface and pollute the row-centric state shape; a sibling service keeps each subtree clean.
- Candidate responsibility: own `_KDB.state.hierarchyData.<tableName>` with its own lifecycle/freshness/error fields; expose `readHierarchy`, `waitForHierarchy`, `reloadHierarchy`, `ensureFreshHierarchy`, `getState`, `destroy`; emit `hierarchyData:loadFinished` / `hierarchyData:loadFailed`.
- Boundary against `tableDataService`: `tableDataService` keeps `lifecycle/rows/rowCount`; `hierarchyDataService` keeps `lifecycle/data/semantics`. Both share the same Cognos host-call wrappers but no state.
- Promotion criteria: trigger is the first hierarchy consumer in a later port (e.g. Stelle / Sicht hierarchy widgets in `singleSelect/specialRights`). Until then, no skeleton, no contract.

## How To Add An Entry

1. Title with the proposed name.
2. One short paragraph describing the candidate responsibility.
3. Bullet notes on boundary with existing services, expected consumers, and promotion criteria.
4. Keep entries short. Detailed design goes into the module contract when the candidate is promoted, not here.
