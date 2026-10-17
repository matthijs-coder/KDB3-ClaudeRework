define([
  "./config.js",
  "./state.js",
  "./selectors.js",
  "../singleSelect/config.js",
  "../_core/dockHandoff.js"
], function (_config, _state, _selectors, _singleSelectConfig, _dockHandoff) {
  "use strict";

  var actions = _state.actions;
  var errorCodes = _config.ERROR_CODES;
  var SINGLE_SELECT_STATE_CHANGED = _singleSelectConfig.actions.FILTER_DOCK_STATE_CHANGED;
  var SINGLE_SELECT_POPUP_READY = _singleSelectConfig.actions.FILTER_DOCK_POPUP_READY;

  var HANDOFF_PROFILE = {
    labelDefault: "",
    scopeMode: "filterScopeFirst",
    keyScope: "scopeType",
    timestamp: "observedAtOnly",
    fields: [
      ["filterLabel", "derived"],
      ["filterKey", "derived"],
      ["filterScope", "derived"],
      ["filterType", "filterType"],
      ["scopeType", "derived"],
      ["tabId", "orNull"],
      ["scopeId", "scopeIdNullable"],
      ["filterConfig", "copyOrEmpty"],
      ["condition", function (_raw, _derived) {
        return _derived.caps.condition != null ? _derived.caps.condition : _raw.condition || null;
      }],
      ["semanticSpecialFilterId", "alwaysNull"],
      ["itemNameHint", "orNull"],
      ["itemIdHint", "orNull"],
      ["semanticInstanceKeyHint", "orNull"],
      ["interactionType", "derived"],
      ["isAlleOption", "isTrue"],
      ["optionLabel", "optionLabel"],
      ["popup", "copyOrNull"],
      ["capabilities", "derived"],
      ["timestamp", "derived"],
      ["runtimeFilterId", "orNull", "filterId"]
    ],
    finish: function (_mapped) {
      var canonicalFilterId = _config.resolveSpecialFilterId(_config.DEFINITIONS_BY_ID, {
        filterId: _mapped.runtimeFilterId,
        condition: _mapped.condition,
        filterLabel: _mapped.filterLabel
      });
      if (!canonicalFilterId) {
        return null;
      }
      _mapped.filterId = canonicalFilterId;
      _mapped.semanticSpecialFilterId = canonicalFilterId;
      return _mapped;
    }
  };

  function mapFilterDockHandoff(_handoff) {
    return _dockHandoff.mapDockHandoff(_handoff, HANDOFF_PROFILE);
  }

  function buildDelegatedPayload(_mappedHandoff, _alleAllowed) {
    return Object.assign({}, _mappedHandoff, {
      filterType: "specialSingleSelect",
      authorizedByOwner: "specialSingleSelect",
      semanticSpecialFilterId: _mappedHandoff.semanticSpecialFilterId || _mappedHandoff.filterId,
      runtimeFilterId: _mappedHandoff.runtimeFilterId || null,
      filterConfig: Object.assign({}, _mappedHandoff.filterConfig || {}),
      capabilities: Object.assign({}, _mappedHandoff.capabilities || {}, {
        hasAlleOption: _alleAllowed === true
      })
    });
  }

  function delegateToSingleSelect(_KDB, _mappedHandoff, _actionType, _alleAllowed) {
    var api = _KDB && _KDB.api ? _KDB.api.singleSelect : null;
    var dispatchType;
    if (!api || !_mappedHandoff) {
      return false;
    }
    dispatchType = _actionType === actions.FILTER_DOCK_POPUP_READY
      ? SINGLE_SELECT_POPUP_READY
      : SINGLE_SELECT_STATE_CHANGED;
    api.dispatch({ type: dispatchType, payload: buildDelegatedPayload(_mappedHandoff, _alleAllowed) });
    return true;
  }

  function handleFilterDockHandoff(_ctx, _rawPayload, _actionType) {
    try {
      var mappedHandoff = mapFilterDockHandoff(_rawPayload);
      if (!mappedHandoff || mappedHandoff.filterType !== "specialSingleSelect" || _ctx.guard.isDisposed()) {
        return;
      }
      var filterState = _selectors.readSpecialFilterEntry(_ctx._KDB, mappedHandoff.filterId);
      if (!filterState || filterState.isVisible !== true) {
        return;
      }
      delegateToSingleSelect(_ctx._KDB, mappedHandoff, _actionType, filterState.alleAllowed === true);
    } catch (_error) {
      console.error("[specialSingleSelect.handleFilterDockHandoff] failed", _error);
    }
  }

  function normalizeUserSelectionCommittedPayload(_payload) {
    var payload = _payload || {};
    var canonicalFilterId = _config.resolveSpecialFilterId(_config.DEFINITIONS_BY_ID, payload);
    var selection = payload && payload.selection;
    if (!canonicalFilterId) {
      return null;
    }
    return {
      filterId: canonicalFilterId,
      runtimeFilterId: payload.runtimeFilterId || payload.filterId,
      filterInstanceId: payload.filterInstanceId || null,
      semanticSpecialFilterId: payload.semanticSpecialFilterId || canonicalFilterId,
      filterKey: payload.filterKey,
      filterLabel: payload.filterLabel,
      filterScope: payload.filterScope,
      condition: payload.condition,
      displayValue:
        selection && selection.displayValue != null ? selection.displayValue : payload.displayValue,
      useValue: selection && selection.useValue != null ? selection.useValue : payload.useValue,
      observedAt: payload.observedAt || Date.now()
    };
  }

  function reduceCommittedPayload(_normalizedPayload) {
    if (!_normalizedPayload || !_normalizedPayload.filterId || !_normalizedPayload.filterInstanceId) {
      return null;
    }
    if (_normalizedPayload.displayValue == null || _normalizedPayload.useValue == null) {
      return null;
    }
    return {
      filterId: _normalizedPayload.filterId,
      semanticSpecialFilterId: _normalizedPayload.semanticSpecialFilterId || _normalizedPayload.filterId,
      filterInstanceId: _normalizedPayload.filterInstanceId,
      displayValue: _normalizedPayload.displayValue,
      useValue: _normalizedPayload.useValue
    };
  }

  function buildOwnerAck(_ok, _code, _message) {
    return {
      ok: _ok === true,
      acknowledged: _ok === true,
      degraded: false,
      disposed: false,
      errorCode: _ok === true ? null : (_code || errorCodes.OWNER_CALLBACK_FAILED),
      errorMessage: _ok === true ? null : (_message || null)
    };
  }

  function isTargetMatch(_entry, _target) {
    var id = _entry && _entry.filterId;
    return !!id && !!_target && (id === _target.filterId || id === _target.semanticSpecialFilterId);
  }

  function findTargetResult(_results, _target) {
    var results = Array.isArray(_results) ? _results : [];
    for (var idx = 0; idx < results.length; idx += 1) {
      if (isTargetMatch(results[idx], _target)) {
        return results[idx];
      }
    }
    return null;
  }

  function buildTargetFailureAck(_syncAck, _targetResult, _target, _missingTarget) {
    var diagnostics = Array.isArray(_syncAck.diagnostics) ? _syncAck.diagnostics.slice() : [];
    var firstTargetDiagnostic = diagnostics.filter(function (_entry) { return isTargetMatch(_entry, _target); })[0] || {};
    var aborted = (_missingTarget && _syncAck && _syncAck.aborted === true) ||
      (_targetResult && (_targetResult.aborted === true || _targetResult.superseded === true));
    var disposed = (_missingTarget && _syncAck && _syncAck.disposed === true) ||
      (_targetResult && _targetResult.disposed === true);
    var errorCode = _missingTarget
      ? errorCodes.OWNER_CALLBACK_FAILED
      : (_targetResult.errorCode || firstTargetDiagnostic.code || _syncAck.errorCode || errorCodes.OWNER_CALLBACK_FAILED);
    var errorMessage = _missingTarget
      ? "target special filter result missing from sync results"
      : (_targetResult.errorMessage || firstTargetDiagnostic.message || _syncAck.errorMessage || "target special filter sync failed");
    if (aborted) {
      errorCode = errorCode || errorCodes.OWNER_CALLBACK_FAILED;
      errorMessage = "target special filter sync aborted before owner ack";
    }
    if (disposed) {
      errorCode = errorCode || errorCodes.OWNER_CALLBACK_FAILED;
      errorMessage = _syncAck.errorMessage || "specialSingleSelect owner disposed during sync";
    }
    return {
      ok: false,
      acknowledged: false,
      degraded: true,
      disposed: disposed === true,
      retryable: aborted === true || _missingTarget === true,
      errorCode: errorCode,
      errorMessage: errorMessage,
      diagnostics: diagnostics
    };
  }

  // Runs inside a promise callback, so it converts to an owner ack instead of rejecting the caller's promise.
  function buildTargetScopedAck(_syncResult, _target) {
    try {
      var result = _syncResult || {};
      var diagnostics = Array.isArray(result.diagnostics) ? result.diagnostics.slice() : [];
      var first = diagnostics[0] || {};
      var syncAck = {
        ok: result.ok === true,
        acknowledged: result.ok === true && result.degraded !== true,
        degraded: result.degraded === true || result.ok !== true,
        disposed: result.disposed === true,
        aborted: result.aborted === true,
        retryable: result.retryable === true,
        errorCode: result.ok === true ? null : (first.code || errorCodes.OWNER_CALLBACK_FAILED),
        errorMessage: result.ok === true ? null : (first.message || "specialSingleSelect sync failed"),
        diagnostics: diagnostics
      };
      var targetResult = findTargetResult(result.results, _target);
      var missingTarget = !targetResult;
      if (missingTarget || targetResult.ok !== true || targetResult.aborted === true ||
        targetResult.disposed === true || targetResult.superseded === true) {
        return buildTargetFailureAck(syncAck, targetResult, _target, missingTarget);
      }
      var unrelatedDiagnostics = diagnostics.filter(function (_entry) { return !isTargetMatch(_entry, _target); });
      return {
        ok: true,
        acknowledged: true,
        degraded: syncAck.degraded === true || unrelatedDiagnostics.length > 0,
        disposed: targetResult.disposed === true,
        retryable: syncAck.retryable === true || unrelatedDiagnostics.length > 0,
        errorCode: null,
        errorMessage: null,
        diagnostics: diagnostics
      };
    } catch (_error) {
      console.error("[specialSingleSelect.buildTargetScopedAck] failed", _error);
      return buildOwnerAck(false, errorCodes.OWNER_CALLBACK_FAILED, "target-scoped owner ack evaluation failed");
    }
  }

  return {
    handleFilterDockHandoff: handleFilterDockHandoff,
    normalizeUserSelectionCommittedPayload: normalizeUserSelectionCommittedPayload,
    reduceCommittedPayload: reduceCommittedPayload,
    buildOwnerAck: buildOwnerAck,
    buildTargetScopedAck: buildTargetScopedAck,
    mapFilterDockHandoff: mapFilterDockHandoff // also exported for tools/tests
  };
});
