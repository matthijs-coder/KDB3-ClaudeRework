define([
  "../../state.js",
  "../../selectors.js",
  "../../config.js",
  "../viewSync.js",
  "./hostScopes.js",
  "./widgetVisNotify.js"
], function (_state, _selectors, _config, _viewSync, _hostScopes, _widgetVisNotify) {
  "use strict";

  var USER_WIDGET_NOTIFY_DEFER_MS = 600;

  function readTableLifecycle(_KDB, _tableKey) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableInput;
    var tableState;
    if (!tableData || typeof tableData.readTableState !== "function" || !_tableKey) {
      return null;
    }
    tableInput = _config.buildTableInput(_KDB, _tableKey);
    if (!tableInput) {
      return null;
    }
    tableState = tableData.readTableState(tableInput);
    return tableState && tableState.lifecycle ? tableState.lifecycle : null;
  }

  function areKeysReady(_KDB, _keys) {
    var idx;
    for (idx = 0; idx < _keys.length; idx += 1) {
      if (readTableLifecycle(_KDB, _keys[idx]) !== "ready") {
        return false;
      }
    }
    return _keys.length > 0;
  }

  function buildInputs(_KDB, _keys) {
    var inputs = [];
    var idx;
    var tableInput;
    for (idx = 0; idx < _keys.length; idx += 1) {
      tableInput = _config.buildTableInput(_KDB, _keys[idx]);
      if (!tableInput) {
        return null;
      }
      inputs.push(tableInput[0]);
    }
    return inputs;
  }

  function resolveReadinessAfterFailure(_error) {
    console.error("[dienststelle.awaitDataReady] waitForRows failed", _error);
    return false;
  }

  function awaitDataReady(_KDB, _keys) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var keys = Array.isArray(_keys) ? _keys : [];
    var inputs;
    if (!keys.length) {
      return Promise.resolve(true);
    }
    if (areKeysReady(_KDB, keys)) {
      return Promise.resolve(true);
    }
    if (!tableData || typeof tableData.waitForRows !== "function") {
      return Promise.resolve(false);
    }
    inputs = buildInputs(_KDB, keys);
    if (!inputs) {
      return Promise.resolve(false);
    }
    // Always pass an array: normalizeTableInputs throws on a bare object.
    return tableData
      .waitForRows(inputs)
      .then(areKeysReady.bind(null, _KDB, keys))
      .catch(resolveReadinessAfterFailure);
  }

  function dispatchFilterStatus(_dispatchInternal, _payload) {
    _dispatchInternal({
      type: _state.ACTIONS.FILTER_STATUS_CHANGED,
      payload: _payload
    });
  }

  function ensureDienststelleTimers(_KDB) {
    var runtime;
    try {
      runtime = _KDB && _KDB.runtime ? _KDB.runtime.dienststelle : null;
      if (!runtime) { return null; }
      runtime.timers = runtime.timers || {};
      return runtime.timers;
    } catch (_error) {
      console.warn("[dienststelle.reconcileConfirmed] timers bucket failed", _error);
      return null;
    }
  }

  function fireUserWidgetNotifyIfLive(_KDB, _timerId, _context, _definition, _reconcileResult) {
    var liveTimers;
    try {
      liveTimers = _KDB && _KDB.runtime && _KDB.runtime.dienststelle && _KDB.runtime.dienststelle.timers;
      if (liveTimers) {
        if (liveTimers.userNotify !== _timerId) { return; }
        delete liveTimers.userNotify;
      }
      _widgetVisNotify.notifyWidgetChanged(_KDB, _context, _definition, _reconcileResult);
    } catch (_error) {
      console.warn("[dienststelle.reconcileConfirmed] userNotify failed", _error);
    }
  }

  function deferUserWidgetNotify(_KDB, _context, _definition, _reconcileResult) {
    var timers;
    var previous;
    var timerId;
    try {
      timers = ensureDienststelleTimers(_KDB);
      previous = timers ? timers.userNotify : null;
      if (previous != null) { clearTimeout(previous); }
      timerId = setTimeout(function () {
        fireUserWidgetNotifyIfLive(_KDB, timerId, _context, _definition, _reconcileResult);
      }, USER_WIDGET_NOTIFY_DEFER_MS);
      if (timers) { timers.userNotify = timerId; }
    } catch (_error) {
      console.warn("[dienststelle.reconcileConfirmed] defer userNotify failed", _error);
    }
  }

  function scheduleVisualizationWidgetNotify(_KDB, _context, _definition, _reconcileResult) {
    var context = _context || {};
    var contextSource = context.source != null ? String(context.source) : "";
    var effective;
    if (!_reconcileResult || _reconcileResult.readinessFailed === true) {
      return;
    }
    effective = _widgetVisNotify.readEffectiveSelection(_reconcileResult);
    if (!effective.selection || !effective.selection.useValue) {
      return;
    }
    if (contextSource === "user" && context.commitFromUser === true) {
      deferUserWidgetNotify(_KDB, context, _definition, _reconcileResult);
      return;
    }
    _widgetVisNotify.notifyWidgetChanged(_KDB, context, _definition, _reconcileResult);
  }

  function handleDataReadyResult(_KDB, _dispatchInternal, _definition, _context, _isReady) {
    if (!_isReady) {
      dispatchFilterStatus(_dispatchInternal, {
        filterKey: _definition.activeFilterKey,
        visibleFilterLabel: _definition.visibleFilterLabel,
        status: "error",
        errorCode: "DIENSTSTELLE_TABLE_DATA_NOT_READY",
        errorMessage: "Required Dienststelle table data is not ready."
      });
      _dispatchInternal({
        type: _state.ACTIONS.ERROR,
        payload: {
          errorCode: "DIENSTSTELLE_TABLE_DATA_NOT_READY",
          errorMessage: "Required Dienststelle table data is not ready."
        }
      });
      return null;
    }

    dispatchFilterStatus(_dispatchInternal, {
      filterKey: _definition.activeFilterKey,
      visibleFilterLabel: _definition.visibleFilterLabel,
      status: "active"
    });

    return Promise.resolve(_hostScopes.reconcileHostScopes(_KDB, _dispatchInternal, _definition, _context)).then(
      function (_reconcileResult) {
        if (_reconcileResult) {
          scheduleVisualizationWidgetNotify(_KDB, _context, _definition, _reconcileResult);
        }
        return _reconcileResult;
      }
    );
  }

  function reconcileConfirmed(_KDB, _dispatchInternal, _context) {
    var context = _context || {};
    var definition = _config.resolveDefinition(context.activeSichtValue);
    var tableKeys;
    if (!definition) {
      console.warn("[dienststelle.reconcileConfirmed] abort: no definition", context.activeSichtValue);
      return Promise.resolve(null);
    }
    tableKeys = [definition.defaultTableKey];
    dispatchFilterStatus(_dispatchInternal, {
      filterKey: definition.activeFilterKey,
      visibleFilterLabel: definition.visibleFilterLabel,
      status: "loading"
    });

    return awaitDataReady(_KDB, tableKeys).then(
      handleDataReadyResult.bind(null, _KDB, _dispatchInternal, definition, context)
    );
  }

  function readActiveSichtValue(_KDB, _context) {
    if (_context && _context.activeSichtValue != null) {
      return String(_context.activeSichtValue);
    }
    var ctx = _selectors.readActiveDienststelleContext(_KDB);
    if (ctx && ctx.activeSichtValue) {
      return String(ctx.activeSichtValue);
    }
    var sichtApi = _KDB && _KDB.api ? _KDB.api.sicht : null;
    var sichtState;
    if (sichtApi && typeof sichtApi.getState === "function") {
      sichtState = sichtApi.getState();
      if (sichtState && sichtState.activeSichtValue) {
        return String(sichtState.activeSichtValue);
      }
    }
    return null;
  }

  function runReconcile(_KDB, _dispatchInternal, _reconcile, _context) {
    var context = _context || {};
    var activeSichtValue = readActiveSichtValue(_KDB, context);
    if (!activeSichtValue) {
      return Promise.resolve(null);
    }
    return _reconcile(_KDB, _dispatchInternal, {
      activeSichtValue: activeSichtValue,
      source: context.source || "sync",
      isHistoryReplay: context.isHistoryReplay === true,
      commitFromUser: context.commitFromUser === true,
      commitSourceScope: context.commitSourceScope,
      commitSourceWasClear: context.commitSourceWasClear,
      allowDefaulting: context.allowDefaulting === true,
      filterScope: context.filterScope,
      scopeId: context.scopeId,
      viewSyncHandoff: context.viewSyncHandoff,
      observedAt: context.observedAt
    }).then(function (_reconcileResult) {
      _viewSync.scheduleViewSync(_KDB, context, _reconcileResult);
      return _reconcileResult;
    });
  }

  return {
    reconcileConfirmed: reconcileConfirmed,
    runReconcile: runReconcile,
    awaitDataReady: awaitDataReady
  };
});
