define([
  "../state.js",
  "../config.js",
  "../view/syncView.js",
  "../view/dockNames.js",
  "./hostScope/clear.js",
  "./reconcile/runReconcile.js"
], function (_state, _config, _syncView, _dockNames, _clear, _runReconcile) {
  "use strict";

  function readActiveSichtFromApi(_KDB) {
    var sichtApi = _KDB && _KDB.api ? _KDB.api.sicht : null;
    var sichtState;
    if (!sichtApi || typeof sichtApi.getState !== "function") {
      return null;
    }
    sichtState = sichtApi.getState();
    return sichtState && sichtState.activeSichtValue ? String(sichtState.activeSichtValue) : null;
  }

  function readPreviousHierarchyKey(_KDB) {
    var state = _KDB && _KDB.state && _KDB.state.filters
      ? _KDB.state.filters.dienststelle
      : null;
    return state && state.activeHierarchyTableKey
      ? String(state.activeHierarchyTableKey)
      : "";
  }

  function appendKey(_keys, _seen, _key, _nextKey) {
    var key = _key ? String(_key) : "";
    if (!key || key === _nextKey || _seen[key]) {
      return;
    }
    _seen[key] = true;
    _keys.push(key);
  }

  function collectInactiveHierarchyKeys(_KDB, _nextKey) {
    var keys = [];
    var seen = {};
    appendKey(keys, seen, readPreviousHierarchyKey(_KDB), _nextKey);
    Object.keys(_config.DEFINITIONS || {}).forEach(function (sichtKey) {
      var entry = _config.DEFINITIONS[sichtKey];
      appendKey(keys, seen, entry && entry.hierarchyTableKey, _nextKey);
    });
    return keys;
  }

  function toTableInput(_key) {
    return { tableName: _key };
  }

  function onAbortTableRejected(_err) {
    console.error("[dienststelle.abortPreviousHierarchyWarmup] abortTable rejected", _err);
  }

  function abortPreviousHierarchyWarmup(_KDB, _definition) {
    try {
      var nextKey = _definition && _definition.hierarchyTableKey
        ? String(_definition.hierarchyTableKey)
        : "";
      var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
      var keys;
      var abortPromise;
      if (!nextKey || !tableData || typeof tableData.abortTable !== "function") {
        return;
      }
      keys = collectInactiveHierarchyKeys(_KDB, nextKey);
      if (!keys.length) {
        return;
      }
      abortPromise = tableData.abortTable(keys.map(toTableInput));
      if (abortPromise && typeof abortPromise.catch === "function") {
        abortPromise.catch(onAbortTableRejected);
      }
    } catch (err) {
      console.error("[dienststelle.abortPreviousHierarchyWarmup] failed", err);
    }
  }

  // Hierarchy tables are not loaded at boot (load:false); warm up the active one here.
  // tableData dedupes concurrent loads; a real failure is reported by runLoadTableWork.
  function warmUpActiveHierarchy(_KDB, _definition) {
    var runtime = _KDB.runtime && _KDB.runtime.dienststelle;
    var warmup;
    if (!_definition || !_definition.hierarchyTableKey) {
      return;
    }
    warmup = _runReconcile.awaitDataReady(_KDB, [_definition.hierarchyTableKey]);
    if (runtime && runtime.pendingPromises) {
      runtime.pendingPromises.hierarchyWarmup = warmup;
    }
  }

  function syncFromSicht(_KDB, _dispatchInternal, _payload) {
    var payload = _payload || {};
    var activeSichtValue =
      payload.activeSichtValue != null ? String(payload.activeSichtValue) : readActiveSichtFromApi(_KDB);
    var definition = _config.resolveDefinition(activeSichtValue);
    var selection = payload.selection || {};
    if (!definition) {
      console.warn("[dienststelle.syncFromSicht] abort: no definition for sicht", activeSichtValue);
      return Promise.resolve(null);
    }
    abortPreviousHierarchyWarmup(_KDB, definition);
    warmUpActiveHierarchy(_KDB, definition);
    return _clear.deactivateInactiveVariants(_KDB, _dispatchInternal, definition).then(function () {
      _dispatchInternal({
        type: _state.ACTIONS.SICHT_CHANGED,
        payload: {
          activeSichtValue: definition.activeSichtValue,
          activeFilterKey: definition.activeFilterKey,
          visibleFilterLabel: definition.visibleFilterLabel,
          activeHierarchyTableKey: definition.hierarchyTableKey,
          activeDefaultTableKey: definition.defaultTableKey,
          selection: {
            displayValue:
              selection.displayValue != null
                ? String(selection.displayValue)
                : definition.activeSichtValue,
            useValue: selection.useValue != null ? String(selection.useValue) : "",
            source: payload.source || "user"
          },
          source: payload.source || "user",
          observedAt: payload.observedAt != null ? payload.observedAt : Date.now(),
          isHistoryReplay: payload.source === "historyReplay" || payload.isHistoryReplay === true
        }
      });
      return _runReconcile.reconcileConfirmed(_KDB, _dispatchInternal, {
        activeSichtValue: definition.activeSichtValue,
        source: payload.source || "user",
        isHistoryReplay: payload.source === "historyReplay" || payload.isHistoryReplay === true,
        observedAt: payload.observedAt != null ? payload.observedAt : Date.now()
      }).then(function (_reconcileResult) {
        _dockNames.syncFilterDockNames(_KDB);
        _syncView.syncViewFromState(_KDB, null);
        return _reconcileResult;
      });
    });
  }

  return {
    abortPreviousHierarchyWarmup: abortPreviousHierarchyWarmup,
    syncFromSicht: syncFromSicht
  };
});
