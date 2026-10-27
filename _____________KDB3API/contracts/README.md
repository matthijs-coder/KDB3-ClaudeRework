# Contracts

Reference contracts for the KDB3 modules and services. One living contract per module; the contract-per-change workflow is retired. Finished work orders, deltas and prompts are in [`_archive/`](_archive/README.md).

## Living contracts

- [`cognosHostService.md`](cognosHostService.md): Ring-1 Cognos host adapter (facets, owner catalogue).
- [`core.md`](core.md): Core bootstrap tranche 1.
- [`dashboardPdf.md`](dashboardPdf.md): Dashboard PDF export.
- [`dataSourceContext.md`](dataSourceContext.md): Active datasource context (stub).
- [`dienststelle.md`](dienststelle.md): Dienststelle hierarchy filter.
- [`dragDrop.md`](dragDrop.md): Drag and drop.
- [`drillthrough.md`](drillthrough.md): PKZ-AT URL/open service (drillthrough).
- [`filterDock.md`](filterDock.md): Filter dock observer, click classifier, owner router.
- [`footer.md`](footer.md): Dashboard footer.
- [`header.md`](header.md): Dashboard header.
- [`historyControls.md`](historyControls.md): Undo/redo toolbar controls.
- [`historyService.md`](historyService.md): Undo/redo history service.
- [`kdbControl.md`](kdbControl.md): KDB control panel.
- [`metricsTree.md`](metricsTree.md): Kennzahlen (metrics) tree (as built; the original `kennzahlenTree` draft is in `_archive/`).
- [`launchpad.md`](launchpad.md): Launchpad module.
- [`loadingService.md`](loadingService.md): Loading overlay service.
- [`messageService.md`](messageService.md): Shared user-messaging service (toasts).
- [`nativeMultiSelect.md`](nativeMultiSelect.md): Plain Cognos multi-select filters (global and page-context).
- [`pageSurface.md`](pageSurface.md): Page surface and page-size wait.
- [`pdfExportControls.md`](pdfExportControls.md): PDF export controls.
- [`properties.md`](properties.md): Property bootstrap loader and property-change listeners.
- [`shareControls.md`](shareControls.md): Dashboard sharing chrome.
- [`sicht.md`](sicht.md): Sicht / cascading upstream filter.
- [`singleSelect.md`](singleSelect.md): Single-select filter.
- [`specialSingleSelect.md`](specialSingleSelect.md): Special-rights single-select filter.
- [`tableDataService.md`](tableDataService.md): Per-table data service.
- [`tabs.md`](tabs.md): Tabs feature module.
- [`WBParameterSet.md`](WBParameterSet.md): Deferred Dienststelle hierarchy validation.
- [`widgetBase.md`](widgetBase.md): Widget base (routing, lifecycle).
- [`widgetBindingApply.md`](widgetBindingApply.md): Shared Cognos binding-apply service.
- [`widgetBindingPlan.md`](widgetBindingPlan.md): Shared binding-planning service.
- [`widgetSettings.md`](widgetSettings.md): Widget settings (stub).
- [`widgetText.md`](widgetText.md): Text widget.
- [`widgetTopN.md`](widgetTopN.md): TopN resolution widget.
- [`widgetVis.md`](widgetVis.md): Visualization widget.
- [`wienKiControls.md`](wienKiControls.md): Stadt Wien KI chat popup control.
- [`writeback.md`](writeback.md): Writeback services (GET/SET, parameter sets).

## Contract deltas still cited from code or living docs

These stay in place because a JS comment (`KDB3/js/**`) or a living contract/architecture doc still cites them. Move one to `_archive/` once its last citation is rewritten to point at the owning living contract. Citers as of W14 (JS = number of JS files citing it; docs = living docs other than this README):

- [`footer-parameterSetRestore-contractdelta.md`](footer-parameterSetRestore-contractdelta.md): docs `writeback.md`
- [`header-parameterSetRestore-contractdelta.md`](header-parameterSetRestore-contractdelta.md): docs `writeback.md`
- [`historyService-filterInstanceIdentity-contractdelta.md`](historyService-filterInstanceIdentity-contractdelta.md): JS 3 (`singleSelect/{history,config,historyReplay}.js`)
- [`historyService-writebackRestore-contractdelta.md`](historyService-writebackRestore-contractdelta.md): JS 1 (`parameterSet/set/effects/runGuards.js`), docs `writeback.md`
- [`kdbControl-parameterSetRestore-contractdelta.md`](kdbControl-parameterSetRestore-contractdelta.md): docs `writeback.md`
- [`kdbControl-tabFollow-contractdelta.md`](kdbControl-tabFollow-contractdelta.md): docs `architecture/eventSubscribe.md`
- [`kdbControl-tabsCrud-contractdelta.md`](kdbControl-tabsCrud-contractdelta.md): docs `tabs.md`, `messageService.md`, `architecture/jsModuleMap.md`
- [`singleSelect-filterInstanceIdentity-contractdelta.md`](singleSelect-filterInstanceIdentity-contractdelta.md): JS 1 (`singleSelect/history.js`)
- [`tabs-inner-frame-skip-empty-snapshot-contractdelta.md`](tabs-inner-frame-skip-empty-snapshot-contractdelta.md): JS 2, docs `writeback.md`
- [`tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md`](tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md): docs `writeback.md`
- [`tabs-parameterSetRestore-contractdelta.md`](tabs-parameterSetRestore-contractdelta.md): JS 6 (`tabs/{selectors,config,restore/*}.js`), docs `writeback.md`
- [`tabs-writeback-readiness-contractdelta.md`](tabs-writeback-readiness-contractdelta.md): docs `writeback.md`, `widgetBase.md`
- [`widgetBase-lazyLaunchpadRouting-contractdelta.md`](widgetBase-lazyLaunchpadRouting-contractdelta.md): JS 3, docs `writeback.md`, `architecture/eventSubscribe.md`
- [`widgetBase-parameterSetReset-contractdelta.md`](widgetBase-parameterSetReset-contractdelta.md): JS 1 (`widgetSettings/restore.js`), docs `writeback.md`
- [`writeback-get-visibleDashboard-contractdelta.md`](writeback-get-visibleDashboard-contractdelta.md): JS 1 (`collectors/collectTabs.js`), docs `writeback.md`
- [`writeback-step27-bindPerActiveTab-contractdelta.md`](writeback-step27-bindPerActiveTab-contractdelta.md): JS 1, docs `writeback.md`, `widgetTopN.md`
- [`writeback-t2-item5b-contractdelta.md`](writeback-t2-item5b-contractdelta.md): JS 1 (`tabs/restore/parameterSetLanding.js`), docs `writeback.md`

Archived in W14 (no remaining citation): `sicht-filterInstanceIdentity-contractdelta.md`.

Share `pathRef` slice (2026-10-27, PO handover; live law for the outbound share link):

- [`cognosAPI-dashboardPathRef-contractdelta.md`](cognosAPI-dashboardPathRef-contractdelta.md): inner `getPathRef`, `searchPath` conversion.
- [`cognosHost-dashboardPathRef-contractdelta.md`](cognosHost-dashboardPathRef-contractdelta.md): `dashboard` facet `getPathRef`.
- [`shareControls-pathRef-link-contractdelta.md`](shareControls-pathRef-link-contractdelta.md): query link with `pathRef`, click order, builder.
- [`shareControls-pathRef-link-execution-spec.md`](shareControls-pathRef-link-execution-spec.md): allowlist of that slice.

## Other files kept in place

- `futureTodo/`: open backlog and future-todo notes. Closed or superseded notes (including the Phase 1-obsolete cleanup backlogs in `_archive/futureTodo-cleanup-backlogs/`), hand-off prompts and the retired `_template.md` / `_executionSpecTemplate.md` templates are in `_archive/`.
