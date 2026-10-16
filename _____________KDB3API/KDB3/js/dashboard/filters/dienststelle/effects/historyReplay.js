define([
  "../state.js",
  "../selectors.js",
  "../config.js",
  "../history.js",
  "../view/dockNames.js",
  "./viewSync.js",
  "./sichtSync.js",
  "./hostScope/filterRef.js",
  "./hostScope/selection.js",
  "./hostScope/apply.js",
  "./hostScope/clear.js",
  "./reconcile/runReconcile.js"
], function (
  _state,
  _selectors,
  _config,
  _history,
  _dockNames,
  _viewSync,
  _sichtSync,
  _filterRef,
  _selection,
  _apply,
  _clear,
  _runReconcile
) {
  "use strict";

  function copiedHostDisplay(_entry) {
    if (!_entry || _entry.hostDisplay == null || String(_entry.hostDisplay) === "") {
      return "";
    }
    return String(_entry.hostDisplay);
  }

  function toValueObject(_entry) {
    return {
      displayValue: _entry.displayValue != null ? String(_entry.displayValue) : "",
      useValue: _entry.useValue != null ? String(_entry.useValue) : "",
      source: "cognos",
      hostDisplay: copiedHostDisplay(_entry)
    };
  }

  function toScopeValueArray(_selectionValues) {
    var out;
    var idx;
    var entry;
    if (!_selectionValues) {
      return [];
    }
    if (Array.isArray(_selectionValues)) {
      out = [];
      for (idx = 0; idx < _selectionValues.length; idx += 1) {
        entry = _selectionValues[idx];
        if (!entry) {
          continue;
        }
        out.push(toValueObject(entry));
      }
      return out;
    }
    return [toValueObject(_selectionValues)];
  }

  function readScopeHostValues(_KDB, _activeFilterKey, _scopeType, _scopeId, _boundary) {
    var filtersFacet = _filterRef.readFiltersFacet(_KDB);
    var ref;
    var values;
    try {
      ref =
        _scopeType === "global"
          ? _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "global", null)
          : _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", _scopeId);
      if (!ref) {
        return [];
      }
      values = _selection.readFilterValues(ref, filtersFacet);
      return toScopeValueArray(values);
    } catch (error) {
      console.warn("[dienststelle.readConfirmHistorySnapshot." + _boundary + "] host read failed", error);
      return [];
    }
  }

  function readPageContextSnapshot(_KDB, _activeFilterKey) {
    var tabEntries = _filterRef.listDashboardTabScopeIds(_KDB);
    var pageContext = {};
    var idx;
    var entry;
    var rawScopeId;
    var scopeKey;
    for (idx = 0; idx < tabEntries.length; idx += 1) {
      entry = tabEntries[idx];
      rawScopeId = _filterRef.resolveRawPageContextScope(
        _KDB,
        _activeFilterKey,
        entry.normalizedScopeId || entry.scopeId
      );
      if (!rawScopeId) {
        continue;
      }
      scopeKey = String(rawScopeId);
      pageContext[scopeKey] = readScopeHostValues(
        _KDB,
        _activeFilterKey,
        "pageContext",
        rawScopeId,
        "pageContext:" + scopeKey
      );
    }
    return pageContext;
  }

  function readConfirmHistorySnapshot(_KDB) {
    var ctx = _selectors.readActiveDienststelleContext(_KDB);
    var activeFilterKey;
    if (!ctx || !ctx.activeFilterKey) {
      return null;
    }
    activeFilterKey = String(ctx.activeFilterKey);
    return {
      activeSichtValue: ctx.activeSichtValue,
      activeFilterKey: activeFilterKey,
      visibleFilterLabel: ctx.visibleFilterLabel,
      valuesByScope: {
        global: readScopeHostValues(_KDB, activeFilterKey, "global", null, "global"),
        pageContext: readPageContextSnapshot(_KDB, activeFilterKey)
      }
    };
  }

  function finalizeHistoryReplay(_KDB, _dispatchInternal, _reconcileResult) {
    var didApply = _reconcileResult != null;
    if (didApply) {
      _dispatchInternal({
        type: _state.ACTIONS.HISTORY_REPLAY_APPLIED,
        payload: { appliedAt: Date.now() }
      });
      _dockNames.syncFilterDockNames(_KDB);
      _viewSync.scheduleViewSync(
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

  function handleHistoryReplay(_controller, _dispatchInternal, _payload) {
    var payload = _payload || {};
    var target = payload.targetValue;
    if (target == null && payload.step) {
      target = payload.step.old;
    }
    var snapshot = _history.normalizeReplayTargetSnapshot(target);
    var definition;
    var dominantSelection;
    var timestamp;
    if (!snapshot || snapshot.activeSichtValue == null) {
      return Promise.resolve(false);
    }
    definition = _config.resolveDefinition(snapshot.activeSichtValue);
    if (!definition) {
      return Promise.resolve(false);
    }
    snapshot.activeFilterKey = snapshot.activeFilterKey || definition.activeFilterKey;
    snapshot.visibleFilterLabel = snapshot.visibleFilterLabel || definition.visibleFilterLabel;
    _sichtSync.abortPreviousHierarchyWarmup(_controller._KDB, definition);
    return _clear.deactivateInactiveVariants(_controller._KDB, _dispatchInternal, definition)
      .then(function () {
        return _apply.applyStoredScopeValues(_controller._KDB, snapshot);
      })
      .then(function (applyResult) {
        if (!applyResult.applied) {
          console.warn("[dienststelle.historyReplay] blocked:", applyResult.blocker);
          return false;
        }
        dominantSelection = _history.readDominantStoredSelection(snapshot.valuesByScope);
        timestamp = payload.step && payload.step.timestamp != null ? payload.step.timestamp : Date.now();
        _dispatchInternal({
          type: _state.ACTIONS.SICHT_CHANGED,
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
        return _runReconcile.reconcileConfirmed(_controller._KDB, _dispatchInternal, {
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

  return {
    handleHistoryReplay: handleHistoryReplay,
    readConfirmHistorySnapshot: readConfirmHistorySnapshot
  };
});
