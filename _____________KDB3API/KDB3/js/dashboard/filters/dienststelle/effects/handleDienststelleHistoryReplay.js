define([
  "../config/actions.js",
  "./resolveDienststelleDataKey.js",
  "./deactivateInactiveDienststelleVariants.js",
  "./applyStoredDienststelleScopeValues.js",
  "./reconcileConfirmedDienststelle.js",
  "./scheduleDienststelleViewSync.js",
  "./abortPreviousHierarchyWarmup.js",
  "../history/normalizeReplayTargetSnapshot.js",
  "../view/syncDienststelleFilterDockNames.js"
], function (
  _actions,
  _resolveDataKey,
  _deactivateInactive,
  _applyStoredScopeValues,
  _reconcile,
  _scheduleDienststelleViewSync,
  _abortPreviousHierarchyWarmup,
  _normalizeReplay,
  _syncFilterDockNames
) {
  "use strict";

  function finalizeHistoryReplay(_KDB, _dispatchInternal, _reconcileResult) {
    var didApply = _reconcileResult != null;
    if (didApply) {
      _dispatchInternal({
        type: _actions.HISTORY_REPLAY_APPLIED,
        payload: { appliedAt: Date.now() }
      });
      _syncFilterDockNames(_KDB);
      _scheduleDienststelleViewSync(
        _KDB,
        {
          source: "historyReplay",
          isHistoryReplay: true,
          observedAt: Date.now()
        },
        _reconcileResult
      );
    }
    return didApply;
  }

  function handleDienststelleHistoryReplay(_controller, _dispatchInternal, _payload) {
    var payload = _payload || {};
    var target = payload.targetValue;
    if (target == null && payload.step) {
      target = payload.step.old;
    }
    var snapshot = _normalizeReplay.normalizeReplayTargetSnapshot(target);
    var definition;
    var dominantSelection;
    var timestamp;
    if (!snapshot || snapshot.activeSichtValue == null) {
      return Promise.resolve(false);
    }
    definition = _resolveDataKey(snapshot.activeSichtValue);
    if (!definition) {
      return Promise.resolve(false);
    }
    snapshot.activeFilterKey = snapshot.activeFilterKey || definition.activeFilterKey;
    snapshot.visibleFilterLabel = snapshot.visibleFilterLabel || definition.visibleFilterLabel;
    _abortPreviousHierarchyWarmup(_controller._KDB, definition);
    return _deactivateInactive(_controller._KDB, _dispatchInternal, definition)
      .then(function () {
        return _applyStoredScopeValues(_controller._KDB, snapshot);
      })
      .then(function (applyResult) {
        if (!applyResult.applied) {
          console.warn("[dienststelle.historyReplay] blocked:", applyResult.blocker);
          return false;
        }
        dominantSelection = _normalizeReplay.readDominantStoredSelection(snapshot.valuesByScope);
        timestamp = payload.step && payload.step.timestamp != null ? payload.step.timestamp : Date.now();
        _dispatchInternal({
          type: _actions.SICHT_CHANGED,
          payload: {
            activeSichtValue: definition.activeSichtValue,
            activeFilterKey: definition.activeFilterKey,
            visibleFilterLabel: definition.visibleFilterLabel,
            activeHierarchyTableKey: definition.hierarchyTableKey,
            activeDefaultTableKey: definition.defaultTableKey,
            selection: {
              displayValue: dominantSelection
                ? dominantSelection.displayValue
                : definition.activeSichtValue,
              useValue: dominantSelection ? dominantSelection.useValue : "",
              source: "historyReplay"
            },
            source: "historyReplay",
            observedAt: timestamp,
            isHistoryReplay: true
          }
        });
        return _reconcile(_controller._KDB, _dispatchInternal, {
          activeSichtValue: definition.activeSichtValue,
          source: "historyReplay",
          isHistoryReplay: true,
          observedAt: timestamp
        }).then(finalizeHistoryReplay.bind(null, _controller._KDB, _dispatchInternal));
      })
      .catch(function (_error) {
        console.error("[dienststelle.historyReplay] reconcile failed", _error);
        return false;
      });
  }

  return handleDienststelleHistoryReplay;
});
