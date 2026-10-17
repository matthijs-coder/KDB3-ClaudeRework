# Contracts archive

Closed or retired workflow documents (some carry stale Draft / never-implemented statuses), moved here in Phase 0 of the KDB3 cleanup refactor.

- Contents: the retired contract and execution-spec templates, the Dutch `anew.md` kdbControl panel sketch (superseded by `../kdbControl.md`), closed `futureTodo/` notes, per-change `*-contractdelta.md`, `*-execution-spec.md` and `*-fix-spec.md` work orders, port reports, agent hand-off and launch prompts (including those formerly in `futureTodo/`), two architecture design reviews, and the Dutch `overdracht/` writeback hand-over.
- Why: the contract-per-change workflow is retired. Living contracts in `../` describe the current behaviour.
- Everything here is historical only. Do not implement against it. History is preserved (`git log --follow <file>`).
- Layout is flat except two subfolders: `futureTodo-cleanup-backlogs/` (eight pre-Phase-1 file-level cleanup backlogs and the widgets cleanup roadmap, archived in the final docs pass because they describe the old module layouts; Phase 2 follow-ups live in the project coordination notes) and `overdracht/`. `overdracht/` is a subfolder because its `writeback.md` would be confused with the living `../writeback.md`.
- Contract deltas still cited from JS comments or living docs stay in `../` (list with citers in `../README.md`) and move here when those references are rewritten. `sicht-filterInstanceIdentity-contractdelta.md` moved here in W14 (no citation left; the singleSelect delta still names it in prose).

## Possibly unimplemented

Status lines say Draft, approved-but-pending or in progress; check the code before assuming they landed. Most older `Draft` / `Ready for execution` port specs (2026-05) describe ports that did land.

- `loadingService-deferredRemoval-ownership-contractdelta.md` (+ `-execution-spec.md`: executed, live test pending)
- `widgetBase-parameterSetRestore-dropboxTarget-contractdelta.md` (contract only, code pending)
- `widgetTopN-helper-dienststelle-filter-*` and `widgetTopN-filter-retrigger-period-pin-*` (Draft)
- `kdbControl-collapsed-hit-target-contractdelta.md` (code in tree, PO live test pending)
- `widgetVis-parameterSetBinding-degradedNoise-execution-spec.md`, `tabs-duplicate-history-degraded-toast-execution-spec.md`, `tabs-add-max-visible-toast-execution-spec.md` (ready, pending PO go)
- `specialSingleSelect-filterInstanceIdentity-`, `filterDock-filterInstanceIdentity-`, `writeback-filterInstanceIdentity-contractdelta.md`, `tabs-filterScopeSelectors-contractdelta.md`, `cognosAPI-filters-instanceInventory-contractdelta.md` ("Implementation in progress", 2026-07-15)
