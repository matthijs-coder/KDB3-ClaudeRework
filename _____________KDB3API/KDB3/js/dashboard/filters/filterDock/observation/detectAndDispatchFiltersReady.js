define([
  "../config/actions.js",
  "../effects/dispatchFilterHandoff.js",
  "./watchFiltersReady.js",
  "./recordFiltersReadyDiagnostics.js"
], function (
  _actions,
  _dispatchFilterHandoff,
  _watchFiltersReady,
  _recordFiltersReadyDiagnostics
) {
  "use strict";

  function dispatchReady(_ctx, _source) {
    try {
      var selector = _ctx.selectors && _ctx.selectors.filterItemSelector;
      var wrapperCount;
      var observedAt = Date.now();
      var routeDispatchResult;
      if (!selector) {
        return;
      }
      wrapperCount = _ctx.dockRoot.querySelectorAll(selector).length;
      if (wrapperCount < 1) {
        return;
      }
      _ctx.runtime.filtersReadyDispatched = true;
      _watchFiltersReady.clearFiltersReadyWatch(_ctx.runtime);
      _ctx.dispatch({
        type: _actions.FILTERS_READY_OBSERVED,
        payload: {
          filtersReady: true,
          filtersReadyAt: observedAt,
          filterWrapperCount: wrapperCount
        }
      });
      routeDispatchResult = _dispatchFilterHandoff.dispatchFiltersReadyToOwners(_ctx.KDB, {
        reason: "filtersReady",
        source: _source,
        observedAt: observedAt,
        filterWrapperCount: wrapperCount
      });
      _recordFiltersReadyDiagnostics(_ctx.dispatch, routeDispatchResult);
    } catch (error) {
      console.error("[filterDock.dispatchFiltersReady] failed", {
        source: _source
      }, error);
    }
  }

  function __controller(_KDB, _runtime, _dispatch, _dockRoot, _selectors, _options) {
    var selector;
    var wrapperCount;
    var ctx;
    if (!_KDB || !_runtime || !_dockRoot || typeof _dispatch !== "function") {
      return false;
    }
    if (_options && _options.isDisposed && _options.isDisposed()) {
      return false;
    }
    try {
      selector = _selectors && _selectors.filterItemSelector;
      if (!selector) {
        return false;
      }
      wrapperCount = _dockRoot.querySelectorAll(selector).length;
      if (wrapperCount < 1) {
        return false;
      }
      ctx = {
        KDB: _KDB,
        runtime: _runtime,
        dispatch: _dispatch,
        dockRoot: _dockRoot,
        selectors: _selectors,
        options: _options
      };
      return _watchFiltersReady(
        _KDB,
        _runtime,
        _options,
        wrapperCount,
        dispatchReady.bind(null, ctx)
      );
    } catch (error) {
      console.error("[filterDock.detectAndDispatchFiltersReady] failed", error);
      return false;
    }
  }

  return __controller;
});
