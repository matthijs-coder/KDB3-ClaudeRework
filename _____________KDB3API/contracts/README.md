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
- [`widgetDataTable.md`](widgetDataTable.md): Data-table widget (stub).
- [`widgetSettings.md`](widgetSettings.md): Widget settings (stub).
- [`widgetText.md`](widgetText.md): Text widget.
- [`widgetTopN.md`](widgetTopN.md): TopN resolution widget.
- [`widgetVis.md`](widgetVis.md): Visualization widget.
- [`wienKiControls.md`](wienKiControls.md): Stadt Wien KI chat popup control.
- [`writeback.md`](writeback.md): Writeback services (GET/SET, parameter sets).

## Contract deltas still cited from code or living contracts

These stay in place because JS comments or living contracts cite them. Move them to `_archive/` once those references are rewritten.

- [`footer-parameterSetRestore-contractdelta.md`](footer-parameterSetRestore-contractdelta.md)
- [`header-parameterSetRestore-contractdelta.md`](header-parameterSetRestore-contractdelta.md)
- [`historyService-filterInstanceIdentity-contractdelta.md`](historyService-filterInstanceIdentity-contractdelta.md)
- [`historyService-writebackRestore-contractdelta.md`](historyService-writebackRestore-contractdelta.md)
- [`kdbControl-parameterSetRestore-contractdelta.md`](kdbControl-parameterSetRestore-contractdelta.md)
- [`kdbControl-tabFollow-contractdelta.md`](kdbControl-tabFollow-contractdelta.md)
- [`kdbControl-tabsCrud-contractdelta.md`](kdbControl-tabsCrud-contractdelta.md)
- [`sicht-filterInstanceIdentity-contractdelta.md`](sicht-filterInstanceIdentity-contractdelta.md)
- [`singleSelect-filterInstanceIdentity-contractdelta.md`](singleSelect-filterInstanceIdentity-contractdelta.md)
- [`tabs-inner-frame-skip-empty-snapshot-contractdelta.md`](tabs-inner-frame-skip-empty-snapshot-contractdelta.md)
- [`tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md`](tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md)
- [`tabs-parameterSetRestore-contractdelta.md`](tabs-parameterSetRestore-contractdelta.md)
- [`tabs-writeback-readiness-contractdelta.md`](tabs-writeback-readiness-contractdelta.md)
- [`widgetBase-lazyLaunchpadRouting-contractdelta.md`](widgetBase-lazyLaunchpadRouting-contractdelta.md)
- [`widgetBase-parameterSetReset-contractdelta.md`](widgetBase-parameterSetReset-contractdelta.md)
- [`writeback-get-visibleDashboard-contractdelta.md`](writeback-get-visibleDashboard-contractdelta.md)
- [`writeback-step27-bindPerActiveTab-contractdelta.md`](writeback-step27-bindPerActiveTab-contractdelta.md)
- [`writeback-t2-item5b-contractdelta.md`](writeback-t2-item5b-contractdelta.md)

## Other files kept in place

- `futureTodo/`: open backlog and future-todo notes. Closed or superseded notes (including the Phase 1-obsolete cleanup backlogs in `_archive/futureTodo-cleanup-backlogs/`), hand-off prompts and the retired `_template.md` / `_executionSpecTemplate.md` templates are in `_archive/`.
