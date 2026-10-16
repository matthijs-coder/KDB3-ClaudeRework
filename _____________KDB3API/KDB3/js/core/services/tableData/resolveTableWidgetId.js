define([], function () {
  "use strict";

  function isSupportedVisType(visType) {
    return visType === "list" || visType === "hierarchy";
  }

  function isLiveDescriptor(descriptor) {
    return !!descriptor && (descriptor.isLiveWidget === true || descriptor.contentType === "widget.live");
  }

  function readVisType(descriptor) {
    return String((descriptor && descriptor.visType) || "").toLowerCase();
  }

  function readVisTitle(descriptor) {
    return String((descriptor && descriptor.visTitle) || "").trim();
  }

  // One canvas-ready wait and one widget inventory serve every table lookup of a boot.
  function listCanvasWidgetsOnce(_KDB) {
    const runtime = _KDB.runtime.tableData;
    if (Array.isArray(runtime.canvasWidgetsForLookup)) {
      return Promise.resolve(runtime.canvasWidgetsForLookup);
    }
    if (runtime.canvasWidgetsForLookupPromise) {
      return runtime.canvasWidgetsForLookupPromise;
    }
    const canvasFacet = runtime.canvasFacet;
    if (!canvasFacet || typeof canvasFacet.listCanvasWidgets !== "function") {
      return Promise.resolve([]);
    }
    const pending = Promise.resolve(canvasFacet.listCanvasWidgets({ waitUntilReady: true })).then(function (outcome) {
      const list = outcome && outcome.ok === true && Array.isArray(outcome.data) ? outcome.data : [];
      runtime.canvasWidgetsForLookup = list;
      runtime.canvasWidgetsForLookupPromise = null;
      return list;
    }, function (error) {
      runtime.canvasWidgetsForLookupPromise = null;
      throw error;
    });
    runtime.canvasWidgetsForLookupPromise = pending;
    return pending;
  }

  // Resolves to null when the lookup fails: the table then loads as empty instead of failing the whole boot.
  async function resolveTableWidgetId(_KDB, _title) {
    try {
      const title = String(_title || "").trim();
      if (!title) {
        return null;
      }
      const descriptors = await listCanvasWidgetsOnce(_KDB);
      const match = descriptors.find(function (descriptor) {
        return isLiveDescriptor(descriptor) && descriptor.widgetId && isSupportedVisType(readVisType(descriptor)) && readVisTitle(descriptor) === title;
      });
      return match ? match.widgetId : null;
    } catch (error) {
      console.error("[tableDataService.resolveTableWidgetId] widget lookup failed", error);
      return null;
    }
  }

  return resolveTableWidgetId;
});
