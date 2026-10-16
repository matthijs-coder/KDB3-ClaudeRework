define([
  "../config/actions.js",
  "./resolveDienststelleDataKey.js",
  "./awaitDienststelleDataReady.js",
  "./reconcileDienststelleHostScopes.js",
  "./notifyVisualizationWidgetDienststelleChanged.js",
  "./buildVisualizationWidgetDienststellePayload.js"
], function (
  _actions,
  _resolveDataKey,
  _awaitDataReady,
  _reconcileHostScopes,
  _notifyWidget,
  _payloadBuilder
) {
  "use strict";

  var USER_WIDGET_NOTIFY_DEFER_MS = 600;

  function dispatchFilterStatus(_dispatchInternal, _payload) {
    _dispatchInternal({
      type: _actions.FILTER_STATUS_CHANGED,
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
      console.warn("[dienststelle.reconcileConfirmedDienststelle] timers bucket failed", _error);
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
      _notifyWidget(_KDB, _context, _definition, _reconcileResult);
    } catch (_error) {
      console.warn("[dienststelle.reconcileConfirmedDienststelle] userNotify failed", _error);
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
      console.warn("[dienststelle.reconcileConfirmedDienststelle] defer userNotify failed", _error);
    }
  }

  function scheduleVisualizationWidgetNotify(_KDB, _context, _definition, _reconcileResult) {
    var context = _context || {};
    var contextSource = context.source != null ? String(context.source) : "";
    var effective;
    if (!_reconcileResult || _reconcileResult.readinessFailed === true) {
      return;
    }
    effective = _payloadBuilder.readEffectiveSelection(_reconcileResult);
    if (!effective.selection || !effective.selection.useValue) {
      return;
    }
    if (contextSource === "user" && context.commitFromUser === true) {
      deferUserWidgetNotify(_KDB, context, _definition, _reconcileResult);
      return;
    }
    _notifyWidget(_KDB, context, _definition, _reconcileResult);
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
        type: _actions.ERROR,
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

    return Promise.resolve(_reconcileHostScopes(_KDB, _dispatchInternal, _definition, _context)).then(
      function (_reconcileResult) {
        if (_reconcileResult) {
          scheduleVisualizationWidgetNotify(_KDB, _context, _definition, _reconcileResult);
        }
        return _reconcileResult;
      }
    );
  }

  function reconcileConfirmedDienststelle(_KDB, _dispatchInternal, _context) {
    var context = _context || {};
    var definition = _resolveDataKey(context.activeSichtValue);
    var tableKeys;
    if (!definition) {
      console.warn("[dienststelle.reconcileConfirmedDienststelle] abort: no definition", context.activeSichtValue);
      return Promise.resolve(null);
    }
    tableKeys = [definition.defaultTableKey];
    dispatchFilterStatus(_dispatchInternal, {
      filterKey: definition.activeFilterKey,
      visibleFilterLabel: definition.visibleFilterLabel,
      status: "loading"
    });

    return _awaitDataReady(_KDB, tableKeys).then(
      handleDataReadyResult.bind(null, _KDB, _dispatchInternal, definition, context)
    );
  }

  return reconcileConfirmedDienststelle;
});
