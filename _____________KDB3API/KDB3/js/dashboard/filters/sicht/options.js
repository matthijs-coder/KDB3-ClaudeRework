define([
  "./config.js",
  "./state.js",
  "./state/selectors.js",
  "./availability.js",
  "./operations.js",
  "./delegation.js"
], function (_config, _state, _selectors, _availability, _operations, _delegation) {
  "use strict";

  var actions = _state.actions;

  function routeSyncAction(_ctx, _action) {
    var action = _action || {};
    if (action.type === actions.SINGLE_SELECT_INVENTORY_RECONCILED) {
      return applyInventoryReconciled(_ctx, action.payload);
    }
    if (action.type === actions.SYNC_REQUESTED) {
      return applySyncRequested(_ctx);
    }
    return syncSichtOptionsAndStartup(_ctx._KDB, _ctx.dispatchInternal);
  }

  async function applyInventoryReconciled(_ctx, _payload) {
    try {
      var payload = _payload || {};
      var generation = Number(
        payload.inventoryGeneration != null
          ? payload.inventoryGeneration
          : payload.generation
      );
      var allowStartupDefault = payload.allowStartupDefault === true;
      var lastGeneration = readLastInventoryGeneration(_ctx._KDB);
      if (!isFinite(generation)) {
        return buildAck({
          ok: false,
          acknowledged: false,
          code: "SICHT_INVENTORY_GENERATION_INVALID",
          message: "singleSelect inventory callback requires numeric inventoryGeneration"
        });
      }
      if (lastGeneration != null && generation < Number(lastGeneration)) {
        return buildAck({
          code: "SICHT_INVENTORY_GENERATION_STALE",
          retried: false
        });
      }
      if (lastGeneration != null && generation === Number(lastGeneration)) {
        return buildAck({
          code: "SICHT_INVENTORY_GENERATION_DUPLICATE",
          retried: false
        });
      }
      if (!allowStartupDefault) {
        recordInventoryReconciled(_ctx, generation, payload);
        return buildAck({
          code: "SICHT_INVENTORY_STARTUP_SKIPPED_BY_FLAG",
          retried: false
        });
      }
      var startupResult = await syncSichtOptionsAndStartup(
        _ctx._KDB,
        _ctx.dispatchInternal
      );
      var succeeded = isSuccessfulStartupResult(startupResult);
      if (succeeded) {
        recordInventoryReconciled(_ctx, generation, payload);
      }
      return buildAck({
        degraded: !succeeded ||
          (startupResult && startupResult.degraded === true),
        code: succeeded
          ? undefined : "SICHT_INVENTORY_STARTUP_RETRY_PENDING",
        retried: startupResult && startupResult.ok === true,
        startupResult: startupResult
      });
    } catch (error) {
      console.error("[sicht.applyInventoryReconciled] failed", error);
      return buildAck({
        ok: false,
        acknowledged: false,
        code: "SICHT_INVENTORY_RECONCILE_FAILED",
        message: String(error && error.message ? error.message : error)
      });
    }
  }

  async function applySyncRequested(_ctx) {
    try {
      var startupResult = await syncSichtOptionsAndStartup(
        _ctx._KDB, _ctx.dispatchInternal);
      var succeeded = isSuccessfulStartupResult(startupResult);
      return buildAck({
        ok: succeeded, acknowledged: succeeded,
        degraded: !succeeded ||
          (startupResult && startupResult.degraded === true),
        startupResult: startupResult
      });
    } catch (error) {
      console.error("[sicht.applySyncRequested] failed", error);
      return buildAck({
        ok: false, acknowledged: false,
        code: "SICHT_SYNC_REQUESTED_FAILED",
        message: String(error && error.message ? error.message : error)
      });
    }
  }

  function recordInventoryReconciled(_ctx, _generation, _payload) {
    _ctx.dispatchInternal({
      type: actions.SINGLE_SELECT_INVENTORY_RECONCILED,
      payload: {
        inventoryGeneration: _generation,
        source: _payload.source || "singleSelect",
        timestamp: _payload.timestamp != null
          ? _payload.timestamp : Date.now()
      }
    });
  }

  function readLastInventoryGeneration(_KDB) {
    var state = _selectors.readSichtState(_KDB);
    return state && state.meta ? state.meta.lastInventoryGeneration : null;
  }

  function buildAck(_overrides) {
    return Object.assign({
      ok: true,
      acknowledged: true,
      degraded: false,
      retried: false,
      code: null,
      diagnostics: []
    }, _overrides || {});
  }

  function isSuccessfulStartupResult(_result) {
    return !!(_result && (_result.ok === true ||
      (_result.reason === "skipped" &&
        (_result.skipReason === "startupDefaultCommitted" ||
          _result.skipReason === "currentSelectionAlreadySet"))));
  }

  async function syncSichtOptionsAndStartup(_KDB, _dispatchInternal) {
    try {
      var byOption = _availability.evaluateAndStoreSichtOptions(_KDB, _dispatchInternal);
      return await commitStartupSichtDefault(_KDB, _dispatchInternal, byOption);
    } catch (error) {
      console.error("[sicht.syncSichtOptionsAndStartup] failed", error);
      return { ok: false, reason: "syncFailed" };
    }
  }

  // Startup default delegates to singleSelect/applyOwnerSelection and waits for the
  // confirmed sicht/singleSelectCommitted callback.
  async function commitStartupSichtDefault(_KDB, _dispatchInternal, _byOption) {
    var state = _selectors.readSichtState(_KDB);
    var skipReason = readSkipReason(state);
    var candidate;
    var filterInstanceId;
    var inventoryGeneration;
    var result;
    if (skipReason) {
      return { ok: false, reason: "skipped", skipReason: skipReason };
    }
    candidate = selectStartupSichtDefault(_KDB, _byOption);
    if (candidate.ok !== true) {
      return candidate;
    }
    inventoryGeneration = _delegation.readSingleSelectInventoryGeneration(_KDB);
    if (inventoryGeneration == null || !isFinite(Number(inventoryGeneration))) {
      return { ok: false, reason: "inventoryNotReady" };
    }
    _dispatchInternal({
      type: actions.STARTUP_DEFAULT_IN_PROGRESS,
      payload: { startedAt: Date.now() }
    });
    filterInstanceId = _delegation.resolveDelegatedSichtInstanceId(_KDB);
    if (!filterInstanceId) {
      dispatchStartupFailed(_dispatchInternal, "no unique live global Sicht instance available");
      return { ok: false, reason: "startupInstanceUnresolved" };
    }
    try {
      result = await _delegation.dispatchSingleSelectOwnerSelection(_KDB, {
        filterInstanceId: filterInstanceId,
        operationId: _operations.buildSichtOperationId("startup"),
        selection: candidate.selection,
        source: "sichtStartup",
        inventoryGeneration: inventoryGeneration
      });
    } catch (error) {
      console.error("[sicht.startup] commit failed", error);
      dispatchStartupFailed(_dispatchInternal, String(error.message || error));
      return { ok: false, reason: "startupCommitFailed" };
    }
    if (!result || result.ok !== true) {
      var message = readFirstDiagnosticMessage(result);
      console.error("[sicht.startup] commit failed", message);
      dispatchStartupFailed(_dispatchInternal, message);
      return { ok: false, reason: "startupCommitFailed" };
    }
    return {
      ok: true,
      degraded: result.degraded === true,
      diagnostics: result.diagnostics || [],
      selection: candidate.selection,
      reason: candidate.reason
    };
  }

  function dispatchStartupFailed(_dispatchInternal, _message) {
    _dispatchInternal({
      type: actions.STARTUP_DEFAULT_FAILED,
      payload: {
        errorCode: "SICHT_STARTUP_DEFAULT_FAILED",
        errorMessage: _message
      }
    });
  }

  function readSkipReason(_state) {
    var displayValue;
    if (!_state) {
      return "noState";
    }
    if (_state.meta && _state.meta.startupDefaultCommitted === true) {
      return "startupDefaultCommitted";
    }
    if (_state.meta && _state.meta.startupDefaultInProgress === true) {
      return "startupDefaultInProgress";
    }
    displayValue =
      _state.currentSelection && _state.currentSelection.displayValue != null
        ? String(_state.currentSelection.displayValue).trim()
        : "";
    if (displayValue !== "") {
      return "currentSelectionAlreadySet";
    }
    return null;
  }

  function readFirstDiagnosticMessage(_result) {
    return _result && Array.isArray(_result.diagnostics) && _result.diagnostics[0]
      ? _result.diagnostics[0].message
      : "singleSelect owner-selection delegation failed";
  }

  function selectStartupSichtDefault(_KDB, _byOption) {
    var byOption = _byOption || {};
    var idx;
    var optionKey;
    var optionState;
    for (idx = 0; idx < _config.VARIANT_KEYS.length; idx += 1) {
      optionKey = _config.VARIANT_KEYS[idx];
      optionState = byOption[optionKey];
      if (isValidStartupCandidate(optionState)) {
        return {
          ok: true,
          selection: {
            displayValue: optionState.displayValue,
            useValue: optionState.useValue
          },
          reason: "firstEnabled"
        };
      }
    }
    return { ok: false, reason: "noEnabledSichtDefault" };
  }

  function isValidStartupCandidate(_optionState) {
    if (!_optionState) {
      return false;
    }
    return (
      _optionState.isVisible === true &&
      _optionState.isEnabled === true &&
      !isAlleDisplayValue(_optionState.displayValue) &&
      String(_optionState.displayValue || "").trim() !== "" &&
      String(_optionState.useValue || "").trim() !== ""
    );
  }

  function isAlleDisplayValue(_displayValue) {
    return String(_displayValue || "").trim().toLowerCase() === _config.ALLE_LABEL.toLowerCase();
  }

  return {
    routeSyncAction: routeSyncAction,
    selectStartupSichtDefault: selectStartupSichtDefault
  };
});
