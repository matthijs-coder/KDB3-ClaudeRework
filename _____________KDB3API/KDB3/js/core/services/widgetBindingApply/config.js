define([], function () {
  "use strict";

  return {
    // Render-wait budget per timeout profile (ms); options.timeoutMs overrides it.
    TIMEOUTS: Object.freeze({ vis: 12000, helper: 5000 }),
    RENDER_WAIT_DEFAULTS: Object.freeze({
      vis: Object.freeze({ waitForStart: true, intervalMs: 100 }),
      helper: Object.freeze({ waitForStart: false, intervalMs: 100 }),
    }),
    // Recorded as skipped after a clear-only reset (resetIntent.rebuildAfterClear === false).
    SKIPPED_AFTER_CLEAR: Object.freeze([
      "readCurrentVisType",
      "setDatasourceInitial",
      "setVisType",
      "setDatasourceAfterClear",
      "applySlots",
      "removeManagedFilters",
      "applyLocalFilters",
      "applyTopBottom",
      "renderWidget",
      "waitRenderComplete",
    ]),
    REQUIRED_FACET_METHODS: Object.freeze({
      visualizationFacet: Object.freeze([
        "getVisType", "setDataSource", "setVisType", "clearAllLocalFilters", "removeLocalFilter", "clearAllSlots",
        "addDataItemsToSlot", "setTopBottomOnSlot", "setCustomLabelInSlot", "sortDataItemInSlot", "addOrReplaceLocalFilter",
      ]),
      widgetsFacet: Object.freeze(["renderWidget"]),
      // whenRenderStart is optional: without it the render wait only awaits completion.
      canvasFacet: Object.freeze(["whenRenderComplete"]),
    }),
    RENDER_LOADING_MOUNT_KEY_PREFIX: "kdb-widget-render-loading-",
  };
});
