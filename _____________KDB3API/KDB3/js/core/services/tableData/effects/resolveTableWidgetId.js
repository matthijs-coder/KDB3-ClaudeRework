define(["./readCanvasFacet.js"], function (_readCanvasFacet) {
  "use strict";

  function isSupportedVisType(visType) {
    return visType === "list" || visType === "hierarchy";
  }

  function isLiveDescriptor(descriptor) {
    if (!descriptor) {
      return false;
    }
    if (descriptor.isLiveWidget === true) {
      return true;
    }
    return descriptor.contentType === "widget.live";
  }

  function readVisType(descriptor) {
    return String((descriptor && descriptor.visType) || "").toLowerCase();
  }

  function readVisTitle(descriptor) {
    return String((descriptor && descriptor.visTitle) || "").trim();
  }

  function listCanvasWidgetsOnce(_KDB) {
    var runtime = _KDB.runtime && _KDB.runtime.tableData ? _KDB.runtime.tableData : null;
    var canvasFacet;
    if (runtime && Array.isArray(runtime.canvasWidgetsForLookup)) {
      return Promise.resolve(runtime.canvasWidgetsForLookup);
    }
    if (runtime && runtime.canvasWidgetsForLookupPromise) {
      return runtime.canvasWidgetsForLookupPromise;
    }
    canvasFacet = _readCanvasFacet(_KDB);
    if (!canvasFacet || typeof canvasFacet.listCanvasWidgets !== "function") {
      return Promise.resolve([]);
    }
    // One canvas-ready wait + one inventory for the whole boot. Pre-slice-2
    // resolved widgets with a single getCanvasWhenReady; slice 2 repeated
    // waitUntilReady + a full vis/tabs flatten per table (~21×).
    var pending = Promise.resolve(canvasFacet.listCanvasWidgets({ waitUntilReady: true })).then(function (outcome) {
      var list = outcome && outcome.ok === true && Array.isArray(outcome.data) ? outcome.data : [];
      if (runtime) {
        runtime.canvasWidgetsForLookup = list;
        runtime.canvasWidgetsForLookupPromise = null;
      }
      return list;
    }, function (error) {
      if (runtime) {
        runtime.canvasWidgetsForLookupPromise = null;
      }
      throw error;
    });
    if (runtime) {
      runtime.canvasWidgetsForLookupPromise = pending;
    }
    return pending;
  }

  async function resolveTableWidgetId(_KDB, _title) {
    try {
      const title = String(_title || "").trim();
      if (!title) {
        return null;
      }
      const descriptors = await listCanvasWidgetsOnce(_KDB);
      for (let index = 0; index < descriptors.length; index += 1) {
        const descriptor = descriptors[index];
        if (!isLiveDescriptor(descriptor) || !descriptor.widgetId) {
          continue;
        }
        if (!isSupportedVisType(readVisType(descriptor))) {
          continue;
        }
        if (readVisTitle(descriptor) === title) {
          return descriptor.widgetId;
        }
      }
      return null;
    } catch (error) {
      console.error("[tableDataService.resolveTableWidgetId] widget lookup failed", error);
      return null;
    }
  }

  return resolveTableWidgetId;
});
