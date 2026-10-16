define([
  "./readCanvasFacet.js",
  "../config/parameterSetCodes.js"
], function (_readCanvasFacet, _codes) {
  "use strict";

  // delta §7 Q1: maximum; the wait resolves as soon as all waits settle.
  var BUDGET_MS = 5000;
  var KEY_PREFIX = "tabLiveWidgetsReady:";

  async function __controller(_KDB, _tabId) {
    var facet, list, ids, key, runtime, controller, outcomes;
    var ready, notReady, diagnostics, index, outcome, widgetId;
    try {
      facet = _readCanvasFacet(_KDB);
      if (!facet || typeof facet.listCanvasWidgets !== "function" || typeof facet.whenWidgetReady !== "function") {
        console.warn("[tabs.waitForTabLiveWidgetsReady] canvas facet unavailable", _tabId);
        return unavailableResult(_tabId, "canvas facet unavailable", "CANVAS_FACET_UNAVAILABLE");
      }
      list = facet.listCanvasWidgets();
      if (!list || list.ok !== true || !Array.isArray(list.data)) {
        console.warn("[tabs.waitForTabLiveWidgetsReady] canvas widget list failed", _tabId, list && list.errorCode);
        return unavailableResult(_tabId, "canvas widget list failed", (list && list.errorCode) || null);
      }
      ids = [];
      for (index = 0; index < list.data.length; index += 1) {
        if (isLiveWidgetOnTab(list.data[index], _tabId)) {
          ids.push(list.data[index].widgetId);
        }
      }
      if (ids.length === 0) {
        return { liveWidgets: { count: 0, ready: 0, notReady: [] }, diagnostics: [] };
      }
      key = KEY_PREFIX + String(_tabId);
      runtime = _KDB.runtime.tabs;
      runtime.abortControllers = runtime.abortControllers || {};
      if (runtime.abortControllers[key] && typeof runtime.abortControllers[key].abort === "function") {
        runtime.abortControllers[key].abort();
      }
      controller = new AbortController();
      runtime.abortControllers[key] = controller;
      outcomes = await Promise.all(ids.map(armWidgetWait.bind(null, facet, controller.signal)));
      ready = 0;
      notReady = [];
      diagnostics = [];
      for (index = 0; index < ids.length; index += 1) {
        outcome = outcomes[index] || {};
        widgetId = ids[index];
        if (outcome.ok === true) {
          ready += 1;
        } else if (outcome.outcome !== "aborted") {
          notReady.push(widgetId);
          diagnostics.push({ code: _codes.LIVE_WIDGETS_READY_TIMEOUT, message: "live widget not ready within budget", details: { widgetId: widgetId, tabId: _tabId, facetCode: outcome.errorCode || null } });
        }
      }
      if (notReady.length > 0) {
        console.warn("[tabs.waitForTabLiveWidgetsReady] live widgets not ready", _tabId, notReady);
      }
      return { liveWidgets: { count: ids.length, ready: ready, notReady: notReady }, diagnostics: diagnostics };
    } catch (err) {
      console.error("[tabs.waitForTabLiveWidgetsReady] failed", _tabId, err);
      return unavailableResult(_tabId, err && err.message, null);
    } finally {
      releaseTabController(_KDB, key, controller);
    }
  }

  function unavailableResult(_tabId, _message, _facetCode) {
    return { liveWidgets: { count: 0, ready: 0, notReady: [] }, diagnostics: [{ code: _codes.LIVE_WIDGETS_READY_TIMEOUT, message: _message, details: { widgetId: null, tabId: _tabId, facetCode: _facetCode } }] };
  }

  function isLiveWidgetOnTab(_descriptor, _tabId) {
    try {
      return !!(_descriptor && _descriptor.isLiveWidget === true && String(_descriptor.tabId) === String(_tabId));
    } catch (err) {
      console.error("[tabs.waitForTabLiveWidgetsReady] live widget filter failed", _tabId, err);
      throw err;
    }
  }

  function armWidgetWait(_facet, _signal, _widgetId) {
    try {
      return Promise.resolve(_facet.whenWidgetReady(_widgetId, {
        signal: _signal,
        budgetMs: BUDGET_MS
      })).catch(onWaitRejected.bind(null, _widgetId));
    } catch (err) {
      return Promise.resolve(onWaitRejected(_widgetId, err));
    }
  }

  function onWaitRejected(_widgetId, _err) {
    try {
      console.error("[tabs.waitForTabLiveWidgetsReady] wait rejected", _widgetId, _err);
      return { ok: false, outcome: "failed", errorCode: "CANVAS_WAIT_FAILED" };
    } catch (err) {
      console.error("[tabs.waitForTabLiveWidgetsReady] wait rejected", _widgetId, err);
      return { ok: false, outcome: "failed", errorCode: "CANVAS_WAIT_FAILED" };
    }
  }

  function releaseTabController(_KDB, _key, _controller) {
    var controllers;
    try {
      controllers = _controller && _KDB && _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.abortControllers;
      if (controllers && controllers[_key] === _controller) {
        _controller.abort();
        delete controllers[_key];
      }
    } catch (err) {
      console.error("[tabs.waitForTabLiveWidgetsReady] controller release failed", _key, err);
    }
  }

  return __controller;
});
