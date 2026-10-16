define([
  "../runtime.js",
  "../drillthrough/install.js",
  "./domQueries.js",
  "./observer.js",
  "./panel.js"
], function (_visRuntime, _drillthroughInstall, _domQueries, _observer, _panel) {
  "use strict";

  function mapFocusFailure(_outcome, _clickFlag) {
    var diagnostics = {};
    if (!_outcome || _outcome.errorCode === "WIDGETS_HOST_UNAVAILABLE") {
      diagnostics.missingCognosWrapper = true;
    } else {
      diagnostics[_clickFlag] = true;
    }
    return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED", diagnostics: diagnostics };
  }

  function withDiagnostics(_result, _diagnostics) {
    return Object.assign({ ok: _result.ok !== false }, _result, {
      diagnostics: Object.assign({}, _diagnostics, _result.diagnostics || {})
    });
  }

  function exitNativeFocus(_KDB, widgetId, diagnostics) {
    var widgetsFacet = _visRuntime.readHostFacet(_KDB, "widgetsFacet");
    var outcome;
    if (!_domQueries.isWidgetExpanded(widgetId) || !widgetsFacet || typeof widgetsFacet.exitFocusMode !== "function") {
      return;
    }
    outcome = widgetsFacet.exitFocusMode(widgetId);
    if (diagnostics && outcome && outcome.ok === true) {
      diagnostics.exitedNativeFocus = true;
    }
  }

  function disposeChromeThenSyncDrillthrough(_KDB, widgetId, runtime) {
    _panel.disposeFocusModeChrome(widgetId, runtime);
    _drillthroughInstall.syncDrillthroughAfterFocusExit({ _KDB: _KDB, widgetId: widgetId });
  }

  async function activateAfterExpand(_KDB, widgetId, runtime, opts) {
    var diagnostics = { waitedForExpanded: true };
    var expanded = await _domQueries.waitForExpandedState(widgetId, true, opts.waitMs);
    diagnostics.expanded = expanded === true;
    if (!expanded) {
      return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED", diagnostics: diagnostics };
    }
    runtime.focusMode.observedExpanded = true;
    runtime.focusMode.source = opts.source || "programmatic";
    return withDiagnostics(_panel.activateFocusModeChrome(_KDB, widgetId, runtime, opts), diagnostics);
  }

  function enterFocusMode(_KDB, widgetId, runtime, options) {
    var opts = options || {};
    var widgetsFacet;
    var outcome;
    if (_domQueries.isWidgetExpanded(widgetId)) {
      return withDiagnostics(_panel.activateFocusModeChrome(_KDB, widgetId, runtime, opts), {});
    }
    widgetsFacet = _visRuntime.readHostFacet(_KDB, "widgetsFacet");
    if (!widgetsFacet || typeof widgetsFacet.enterFocusMode !== "function") {
      return mapFocusFailure(null, "enterClickFailed");
    }
    outcome = widgetsFacet.enterFocusMode(widgetId);
    if (!outcome || outcome.ok !== true) {
      return mapFocusFailure(outcome, "enterClickFailed");
    }
    return activateAfterExpand(_KDB, widgetId, runtime, opts);
  }

  async function collapseAfterExit(_KDB, widgetId, runtime, opts) {
    var collapsed = await _domQueries.waitForExpandedState(widgetId, false, opts.waitMs);
    var diagnostics = { waitedForCollapsed: true, collapsed: collapsed === true };
    disposeChromeThenSyncDrillthrough(_KDB, widgetId, runtime);
    if (!collapsed) {
      return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED", diagnostics: diagnostics };
    }
    return { ok: true, diagnostics: diagnostics };
  }

  function exitFocusMode(_KDB, widgetId, runtime, options) {
    var opts = options || {};
    var widgetsFacet;
    var outcome;
    if (!_domQueries.isWidgetExpanded(widgetId)) {
      disposeChromeThenSyncDrillthrough(_KDB, widgetId, runtime);
      return Promise.resolve({ ok: true, diagnostics: { alreadyCollapsed: true } });
    }
    widgetsFacet = _visRuntime.readHostFacet(_KDB, "widgetsFacet");
    if (!widgetsFacet || typeof widgetsFacet.exitFocusMode !== "function") {
      return Promise.resolve(mapFocusFailure(null, "exitClickFailed"));
    }
    outcome = widgetsFacet.exitFocusMode(widgetId);
    if (!outcome || outcome.ok !== true) {
      return Promise.resolve(mapFocusFailure(outcome, "exitClickFailed"));
    }
    return collapseAfterExit(_KDB, widgetId, runtime, opts);
  }

  function disposeFocusMode(_KDB, widgetId, runtime) {
    _observer.unregisterFocusWidget(_KDB, widgetId);
    if (!runtime || !runtime.focusMode) {
      return { ok: true, diagnostics: { skipped: "no_focus_bucket" } };
    }
    _panel.disposeFocusModeChrome(widgetId, runtime);
    return { ok: true, diagnostics: { disposed: true, observerUnregistered: true } };
  }

  return {
    enterFocusMode: enterFocusMode,
    exitFocusMode: exitFocusMode,
    exitNativeFocus: exitNativeFocus,
    disposeFocusMode: disposeFocusMode
  };
});
