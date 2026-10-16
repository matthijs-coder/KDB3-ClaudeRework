define([
  "../state/selectors.js",
  "./readWidgetsFacet.js",
  "./readCanvasFacet.js"
], function (_selectors, _readWidgetsFacet, _readCanvasFacet) {
  "use strict";

  // Legacy parity (traverseTabsSafely/waitForLiveWidgetsOnTab): per live
  // widget an explicit render() plus a bounded whenRenderComplete wait.
  var RENDER_COMPLETE_CAP_MS = 2500;

  function outcomeReady(_outcome) {
    return !!(_outcome && _outcome.ok === true && _outcome.data && _outcome.data.ready === true);
  }

  // Renders all onCanvas vis widgets of one tab while that tab is active and
  // waits (bounded, parallel) until Cognos reports render completion. Cognos
  // paints visualizations only on a visible page, so callers must activate
  // the tab first (tabs traverse waitFor: "widgetsRendered").
  function renderTabWidgets(_KDB, _tabId, _renderCompleteCapMs) {
    var widgetIds = listRenderableWidgetIds(_KDB, _tabId);
    var renderCompleteCapMs = typeof _renderCompleteCapMs === "number" && _renderCompleteCapMs > 0
      ? _renderCompleteCapMs
      : RENDER_COMPLETE_CAP_MS;
    if (widgetIds.length === 0) {
      return Promise.resolve({ ok: true, total: 0, rendered: 0, failed: 0 });
    }
    return Promise.all(widgetIds.map(function (widgetId) {
      return renderOne(_KDB, widgetId, renderCompleteCapMs);
    })).then(function (outcomes) {
      var rendered = outcomes.filter(function (outcome) { return outcome === true; }).length;
      return {
        ok: rendered === widgetIds.length,
        total: widgetIds.length,
        rendered: rendered,
        failed: widgetIds.length - rendered
      };
    });
  }

  function listRenderableWidgetIds(_KDB, _tabId) {
    return _selectors.readWidgetsByTab(_KDB, _tabId).filter(function (frame) {
      return frame && frame.placement === "onCanvas" && frame.kind === "vis";
    }).map(function (frame) { return frame.widgetId; });
  }

  async function renderOne(_KDB, widgetId, _renderCompleteCapMs) {
    var widgetsFacet = _readWidgetsFacet(_KDB);
    var canvasFacet = _readCanvasFacet(_KDB);
    var completion;
    var renderOutcome;
    if (!widgetsFacet || typeof widgetsFacet.renderWidget !== "function"
      || !canvasFacet || typeof canvasFacet.whenRenderComplete !== "function") {
      return false;
    }
    try {
      completion = canvasFacet.whenRenderComplete(widgetId);
      swallowLateRejection(completion);
      renderOutcome = await widgetsFacet.renderWidget(widgetId);
      if (!renderOutcome || renderOutcome.ok !== true) {
        return false;
      }
      return await withCap(completion, _renderCompleteCapMs);
    } catch (err) {
      console.warn("[widgetBase.renderTabWidgets] render failed", widgetId, err);
      return false;
    }
  }

  function withCap(promise, capMs) {
    return new Promise(function (resolve) {
      var timerId = setTimeout(function () { resolve(false); }, capMs);
      Promise.resolve(promise).then(function (outcome) {
        clearTimeout(timerId);
        resolve(outcomeReady(outcome));
      }, function () {
        clearTimeout(timerId);
        resolve(false);
      });
    });
  }

  function swallowLateRejection(promise) {
    Promise.resolve(promise).catch(function () { return false; });
  }

  return renderTabWidgets;
});
