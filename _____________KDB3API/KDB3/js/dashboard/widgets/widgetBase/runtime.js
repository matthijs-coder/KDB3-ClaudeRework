define(["../../../core/utils/kit/runtime.js"], function (_runtimeKit) {
  "use strict";

  function ensureWidgetBaseRuntime(_KDB) {
    const runtime = _runtimeKit.ensureRuntime(_KDB, "widgetBase", {
      routedTabIds: {},
      pendingRouteByTabId: {},
      tabMutationSnapshots: {},
      byId: {}
    });
    if (typeof runtime.tabMutationRunId !== "number") {
      runtime.tabMutationRunId = 0;
    }
  }

  function ensureWidgetBaseWidgetRuntime(_KDB, widgetId) {
    ensureWidgetBaseRuntime(_KDB);
    const byId = _KDB.runtime.widgetBase.byId;
    byId[widgetId] = byId[widgetId] || _runtimeKit.ensureRuntimeBuckets({
      domRefs: { shellEl: null, canvasParentEl: null, launchpadSlotEl: null },
      opSeq: 0
    });
  }

  return { ensureWidgetBaseRuntime: ensureWidgetBaseRuntime, ensureWidgetBaseWidgetRuntime: ensureWidgetBaseWidgetRuntime };
});
