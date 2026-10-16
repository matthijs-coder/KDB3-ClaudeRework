define(["./readCanvasFacet.js"], function (_readCanvasFacet) {
  "use strict";

  // Owner waiters stay Promise<boolean>. Facet wait ops resolve Outcome<{ready}>
  // and keep the host Promise in ring 1. No budgetMs: this owner stays unbounded.
  function outcomeReady(_outcome) {
    return !!(_outcome && _outcome.ok === true && _outcome.data && _outcome.data.ready === true);
  }

  function waitForCanvasTransferReady(_KDB) {
    var canvasFacet = _readCanvasFacet(_KDB);
    if (!canvasFacet || typeof canvasFacet.whenCanvasReady !== "function") {
      console.warn("[widgetBase.waitForCanvasTransferReady] canvasFacet.whenCanvasReady unavailable");
      return Promise.resolve(false);
    }
    return Promise.resolve(canvasFacet.whenCanvasReady()).then(function (outcome) {
      return outcomeReady(outcome);
    }).catch(function (err) {
      console.warn("[widgetBase.waitForCanvasTransferReady] canvas ready wait failed", err);
      return false;
    });
  }

  function waitForWidgetTransferReady(_KDB, widgetId) {
    var canvasFacet;
    if (!widgetId) {
      return Promise.resolve(false);
    }
    canvasFacet = _readCanvasFacet(_KDB);
    if (!canvasFacet || typeof canvasFacet.whenWidgetReady !== "function") {
      console.warn("[widgetBase.waitForWidgetTransferReady] canvasFacet.whenWidgetReady unavailable", widgetId);
      return Promise.resolve(false);
    }
    return Promise.resolve(canvasFacet.whenWidgetReady(widgetId)).then(function (outcome) {
      return outcomeReady(outcome);
    }).catch(function (err) {
      console.warn("[widgetBase.waitForWidgetTransferReady] widget ready wait failed", widgetId, err);
      return false;
    });
  }

  return {
    waitForCanvasTransferReady: waitForCanvasTransferReady,
    waitForWidgetTransferReady: waitForWidgetTransferReady
  };
});
