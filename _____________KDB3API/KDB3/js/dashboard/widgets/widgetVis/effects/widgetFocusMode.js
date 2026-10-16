define([
  "./focusMode/domQueries.js",
  "./focusMode/buildFocusPanel.js",
  "./focusMode/focusModeObserver.js",
  "./focusMode/disposeFocusMode.js",
  "./readWidgetsFacet.js",
  "./syncDrillthroughAfterFocusExit.js"
], function (
  _domQueries,
  _activateFocusModeChrome,
  _installFocusModeObserver,
  _disposeFocusMode,
  _readWidgetsFacet,
  _syncDrillthroughAfterFocusExit
) {
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

  function exitNativeFocus(_KDB, widgetId, diagnostics) {
    var widgetsFacet = _readWidgetsFacet(_KDB);
    if (!_domQueries.isWidgetExpanded(widgetId)) {
      return;
    }
    if (!widgetsFacet || typeof widgetsFacet.exitFocusMode !== "function") {
      return;
    }
    var outcome = widgetsFacet.exitFocusMode(widgetId);
    if (diagnostics && outcome && outcome.ok === true) {
      diagnostics.exitedNativeFocus = true;
    }
  }

  function disposeChromeThenSyncDrillthrough(_KDB, widgetId, runtime) {
    try {
      _disposeFocusMode.disposeFocusModeChrome(widgetId, runtime);
      _syncDrillthroughAfterFocusExit({ _KDB: _KDB, widgetId: widgetId });
    } catch (err) {
      console.error("[widgetVis.widgetFocusMode.disposeChromeThenSyncDrillthrough]", widgetId, err);
    }
  }

  function enterFocusMode(_KDB, widgetId, runtime, options) {
    var opts = options || {};
    var diagnostics = {};
    var widgetsFacet;
    var outcome;
    if (_domQueries.isWidgetExpanded(widgetId)) {
      var chromeResult = _activateFocusModeChrome(_KDB, widgetId, runtime, opts);
      return Object.assign({ ok: chromeResult.ok !== false }, chromeResult, {
        diagnostics: Object.assign({}, diagnostics, chromeResult.diagnostics || {})
      });
    }
    widgetsFacet = _readWidgetsFacet(_KDB);
    if (!widgetsFacet || typeof widgetsFacet.enterFocusMode !== "function") {
      return mapFocusFailure(null, "enterClickFailed");
    }
    outcome = widgetsFacet.enterFocusMode(widgetId);
    if (!outcome || outcome.ok !== true) {
      return mapFocusFailure(outcome, "enterClickFailed");
    }
    return _domQueries.waitForExpandedState(widgetId, true, opts.waitMs).then(function (expanded) {
      diagnostics.waitedForExpanded = true;
      diagnostics.expanded = expanded === true;
      if (!expanded) {
        return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED", diagnostics: diagnostics };
      }
      runtime.focusMode.observedExpanded = true;
      runtime.focusMode.source = opts.source || "programmatic";
      var activated = _activateFocusModeChrome(_KDB, widgetId, runtime, opts);
      return Object.assign({ ok: activated.ok !== false }, activated, {
        diagnostics: Object.assign({}, diagnostics, activated.diagnostics || {})
      });
    });
  }

  function exitFocusMode(_KDB, widgetId, runtime, options) {
    var opts = options || {};
    var diagnostics = {};
    var widgetsFacet;
    var outcome;
    if (!_domQueries.isWidgetExpanded(widgetId)) {
      disposeChromeThenSyncDrillthrough(_KDB, widgetId, runtime);
      return Promise.resolve({ ok: true, diagnostics: { alreadyCollapsed: true } });
    }
    widgetsFacet = _readWidgetsFacet(_KDB);
    if (!widgetsFacet || typeof widgetsFacet.exitFocusMode !== "function") {
      return Promise.resolve(mapFocusFailure(null, "exitClickFailed"));
    }
    outcome = widgetsFacet.exitFocusMode(widgetId);
    if (!outcome || outcome.ok !== true) {
      return Promise.resolve(mapFocusFailure(outcome, "exitClickFailed"));
    }
    return _domQueries.waitForExpandedState(widgetId, false, opts.waitMs).then(function (collapsed) {
      diagnostics.waitedForCollapsed = true;
      diagnostics.collapsed = collapsed === true;
      disposeChromeThenSyncDrillthrough(_KDB, widgetId, runtime);
      if (!collapsed) {
        return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED", diagnostics: diagnostics };
      }
      return { ok: true, diagnostics: diagnostics };
    });
  }

  return {
    isWidgetExpanded: _domQueries.isWidgetExpanded,
    enterFocusMode: enterFocusMode,
    exitFocusMode: exitFocusMode,
    exitNativeFocus: exitNativeFocus,
    installFocusModeObserver: _installFocusModeObserver,
    disposeFocusMode: _disposeFocusMode.disposeFocusMode
  };
});
