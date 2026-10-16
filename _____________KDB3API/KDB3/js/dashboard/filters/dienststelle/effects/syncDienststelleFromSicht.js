define([
  "../config/actions.js",
  "./resolveDienststelleDataKey.js",
  "./deactivateInactiveDienststelleVariants.js",
  "./reconcileConfirmedDienststelle.js",
  "./awaitDienststelleDataReady.js",
  "./abortPreviousHierarchyWarmup.js",
  "../view/syncDienststelleViewFromState.js",
  "../view/syncDienststelleFilterDockNames.js"
], function (
  _actions,
  _resolveDataKey,
  _deactivateInactive,
  _reconcile,
  _awaitDataReady,
  _abortPreviousHierarchyWarmup,
  _syncView,
  _syncFilterDockNames
) {
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

  // Warm-up (opvolgfix 2026-08-20): de hiërarchie-tabellen laden niet meer eager
  // bij boot (config load:false — de inactieve Sicht-variant timeoutte op elke
  // boot). Zodra de actieve Sicht bekend is (startup-commit én Sicht-wissel)
  // wordt de actieve hiërarchie hier alvast geladen; tableData dedupet via
  // pendingLoads en awaitDienststelleDataReady rejecteert nooit (catch -> false).
  // Een echte faal van de actieve variant meldt runLoadTableWork zelf (toast);
  // de writeback-restore awaited de hiërarchie daarnaast zelf.
  function warmUpActiveHierarchy(_KDB, definition) {
    var runtime = _KDB.runtime && _KDB.runtime.dienststelle;
    if (!definition || !definition.hierarchyTableKey) {
      return;
    }
    var warmup = _awaitDataReady(_KDB, [definition.hierarchyTableKey]);
    if (runtime && runtime.pendingPromises) {
      runtime.pendingPromises.hierarchyWarmup = warmup;
    }
  }

  function __controller(_KDB, _dispatchInternal, _payload) {
    var payload = _payload || {};
    var activeSichtValue =
      payload.activeSichtValue != null ? String(payload.activeSichtValue) : readActiveSichtFromApi(_KDB);
    var definition = _resolveDataKey(activeSichtValue);
    var selection = payload.selection || {};
    if (!definition) {
      console.warn("[dienststelle.syncDienststelleFromSicht] abort: no definition for sicht", activeSichtValue);
      return Promise.resolve(null);
    }
    _abortPreviousHierarchyWarmup(_KDB, definition);
    warmUpActiveHierarchy(_KDB, definition);
    return _deactivateInactive(_KDB, _dispatchInternal, definition).then(function () {
      _dispatchInternal({
        type: _actions.SICHT_CHANGED,
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
      return _reconcile(_KDB, _dispatchInternal, {
        activeSichtValue: definition.activeSichtValue,
        source: payload.source || "user",
        isHistoryReplay: payload.source === "historyReplay" || payload.isHistoryReplay === true,
        observedAt: payload.observedAt != null ? payload.observedAt : Date.now()
      }).then(function (_reconcileResult) {
        _syncFilterDockNames(_KDB);
        _syncView(_KDB, null);
        return _reconcileResult;
      });
    });
  }

  return __controller;
});
