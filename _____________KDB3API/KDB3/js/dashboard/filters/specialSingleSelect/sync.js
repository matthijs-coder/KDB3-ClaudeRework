define([
  "./config.js",
  "./state.js",
  "./selectors.js",
  "./tableData.js",
  "./view.js",
  "./policy.js"
], function (_config, _state, _selectors, _tableData, _view, _policy) {
  "use strict";

  var actions = _state.actions;

  function dispatchInternal(_ctx, _action) {
    var filtersState;
    if (_ctx.guard.isDisposed() && (!_action || _action.type !== actions.DESTROY)) {
      return;
    }
    filtersState = _ctx._KDB.state && _ctx._KDB.state.filters;
    if (filtersState) {
      filtersState.specialSingleSelect = _ctx.reducer(filtersState.specialSingleSelect, _action);
    }
  }

  // The queue head lives on the shared runtime: a controller registered again on the same _KDB
  // joins the running drain, which must then see the newer controller's request.
  function beginSyncRequest(_ctx, _syncOptions) {
    var abortController = new AbortController();
    if (_ctx.runtime.syncRequest) {
      _ctx.runtime.syncRequest.abortController.abort();
    }
    _ctx.runtime.syncRequest = {
      abortController: abortController,
      signal: abortController.signal,
      options: Object.assign({}, _syncOptions || {}),
      input: _syncOptions || null
    };
    _ctx.runtime.abortControllers.sync = abortController;
    return _ctx.runtime.syncRequest;
  }

  function buildSyncFailure(_syncOptions, _error) {
    return {
      ok: false,
      inventoryGeneration: _syncOptions && _syncOptions.inventoryGeneration,
      source: _syncOptions && _syncOptions.source || null,
      results: [],
      diagnostics: [{
        code: _config.ERROR_CODES.SYNC_FAILED,
        message: _error && _error.message ? _error.message : String(_error)
      }]
    };
  }

  async function runQueuedSync(_ctx, _request) {
    try {
      return await performSync(_ctx, _request.signal, _request.options);
    } catch (_error) {
      if (_ctx.guard.isDisposed()) {
        return undefined;
      }
      console.error("[specialSingleSelect.sync] failed", _error);
      dispatchInternal(_ctx, {
        type: actions.ERROR,
        payload: {
          errorCode: _config.ERROR_CODES.SYNC_FAILED,
          errorMessage: _error && _error.message ? _error.message : String(_error)
        }
      });
      return buildSyncFailure(_request.options, _error);
    }
  }

  async function drainSyncQueue(_ctx) {
    var result;
    while (!_ctx.guard.isDisposed()) {
      var request = _ctx.runtime.syncRequest;
      if (!request) {
        return result;
      }
      result = await runQueuedSync(_ctx, request);
      if (_ctx.runtime.syncRequest === request) {
        return result;
      }
    }
    return result;
  }

  function scheduleSync(_ctx, _syncOptions) {
    var runtime = _ctx.runtime;
    if (_syncOptions && runtime.syncRequest && runtime.syncRequest.input === _syncOptions &&
      runtime.pendingPromises.sync) {
      return runtime.pendingPromises.sync;
    }
    beginSyncRequest(_ctx, _syncOptions);
    if (runtime.pendingPromises.sync) {
      return runtime.pendingPromises.sync;
    }
    var promise = drainSyncQueue(_ctx).finally(function () {
      if (runtime.pendingPromises.sync === promise) {
        delete runtime.pendingPromises.sync;
      }
    });
    runtime.pendingPromises.sync = promise;
    return promise;
  }

  function collectHintLabels(_results, _hintName, _field) {
    var labels = [];
    var idx;
    var result;
    var label;
    if (!Array.isArray(_results)) {
      return labels;
    }
    for (idx = 0; idx < _results.length; idx += 1) {
      result = _results[idx];
      label = result && result[_hintName] && result[_hintName][_field];
      if (typeof label === "string" && label !== "" && labels.indexOf(label) === -1) {
        labels.push(label);
      }
    }
    return labels;
  }

  async function performSync(_ctx, _signal, _syncOptions) {
    var options = _syncOptions || {};
    var root = _selectors.readSpecialSingleSelectState(_ctx._KDB);
    _view.syncSpecialSingleSelectRootClass(root ? root.activeSichtValue : null);
    var alleRead = _tableData.readAlleRightFromTableData(_ctx._KDB);
    var filterIds = Object.keys(_config.DEFINITIONS_BY_ID);
    var results = [];
    var diagnostics = [];
    var idx;
    for (idx = 0; idx < filterIds.length; idx += 1) {
      if (_ctx.guard.isDisposed() || (_signal && _signal.aborted)) {
        return {
          ok: false,
          aborted: true,
          inventoryGeneration: options.inventoryGeneration,
          results: results,
          diagnostics: diagnostics,
          clearedRestoredValues: [],
          appliedDefaultLabels: []
        };
      }
      var result = await syncOneFilter(
        _ctx,
        filterIds[idx],
        _config.DEFINITIONS_BY_ID[filterIds[idx]],
        alleRead,
        _signal,
        options
      );
      results.push(result);
      if (result && result.errorCode) {
        diagnostics.push({
          code: result.errorCode,
          filterId: result.filterId,
          message: result.errorMessage || result.errorCode
        });
      }
    }
    return {
      ok: diagnostics.length === 0,
      inventoryGeneration: options.inventoryGeneration,
      source: options.source || null,
      results: results,
      diagnostics: diagnostics,
      clearedRestoredValues: options.reason === "parameterRestore"
        ? collectHintLabels(results, "restoreClearHint", "filterLabel") : [],
      appliedDefaultLabels: options.reason === "parameterRestore"
        ? collectHintLabels(results, "restoreDefaultHint", "filterLabel") : []
    };
  }

  function resolveFilterKey(_definition, _filterState) {
    if (_filterState && _filterState.filterKey) {
      return _filterState.filterKey;
    }
    return "global__" + _definition.filterLabel;
  }

  async function syncOneFilter(_ctx, _filterId, _definition, _alleRead, _signal, _syncOptions) {
    var currentRoot = _selectors.readSpecialSingleSelectState(_ctx._KDB);
    var currentFilterState = currentRoot.byFilterId[_filterId] || {};
    var filterKey = resolveFilterKey(_definition, currentFilterState);
    var rightRead = _tableData.readRightFromTableData(_ctx._KDB, _definition.rightTableKey);
    var optionRead = _tableData.readFirstValidOptionRow(_ctx._KDB, _definition.optionTableKey);
    var stateWithKey = Object.assign({}, currentFilterState, { filterKey: filterKey });
    var evaluation = evaluateSpecialFilterVisibility(_definition, {
      alleKnown: _alleRead.known,
      alleAllowed: _alleRead.allowed,
      rightKnown: rightRead.known,
      rightAllowed: rightRead.allowed,
      activeSichtValue: currentRoot.activeSichtValue,
      hasDefaultOption: optionRead.known === true && optionRead.option != null
    });
    var patch = {
      filterKey: filterKey,
      alleAllowed: evaluation.alleAllowed,
      rightAllowed: evaluation.rightAllowed,
      isVisibleForSicht: evaluation.isVisibleForSicht,
      isVisible: evaluation.isVisible,
      lastSyncedAt: Date.now(),
      errorCode: null,
      errorMessage: null
    };
    var cognosResult;
    var classEvaluation;
    var policyReady;

    if (_ctx.guard.isDisposed() || (_signal && _signal.aborted)) {
      return { filterId: _filterId, ok: false, aborted: true };
    }

    cognosResult = await _policy.applyAutomaticSpecialSelection(
      _ctx._KDB,
      _definition,
      stateWithKey,
      evaluation,
      optionRead.option,
      _signal,
      _syncOptions || {}
    );
    if (_ctx.guard.isDisposed()) {
      return { filterId: _filterId, ok: false, aborted: true };
    }
    if (cognosResult.patch) {
      patch = Object.assign(patch, cognosResult.patch);
    }
    policyReady = !!cognosResult.patch &&
      !cognosResult.patch.errorCode &&
      (evaluation.alleAllowed === true || evaluation.shouldApplyDefault === true);
    classEvaluation = evaluation;
    if (evaluation.isVisible === true && !policyReady) {
      classEvaluation = Object.assign({}, evaluation, {
        rightAllowed: false,
        isVisible: false
      });
      patch.isVisible = false;
    }
    _view.syncSpecialFilterClasses(_ctx.runtime, _filterId, _definition, classEvaluation);
    if (_ctx.guard.isDisposed()) {
      return { filterId: _filterId, ok: false, aborted: true };
    }
    dispatchInternal(_ctx, {
      type: actions.SYNC_FILTER_EVALUATED,
      payload: { filterId: _filterId, patch: patch }
    });
    return {
      filterId: _filterId,
      ok: !patch.errorCode,
      superseded: !!(_signal && _signal.aborted),
      errorCode: patch.errorCode || null,
      errorMessage: patch.errorMessage || null,
      restoreClearHint: cognosResult && cognosResult.restoreClearHint ? cognosResult.restoreClearHint : null,
      restoreDefaultHint: cognosResult && cognosResult.restoreDefaultHint ? cognosResult.restoreDefaultHint : null
    };
  }

  function normalizeSichtValue(_value) {
    return _value == null ? "" : String(_value).trim();
  }

  function isSichtCompatible(_definition, _activeSichtValue) {
    var allowed = _definition && Array.isArray(_definition.allowedSichtValues)
      ? _definition.allowedSichtValues
      : [];
    var active = normalizeSichtValue(_activeSichtValue);
    if (!active) {
      return false;
    }
    return allowed.indexOf(active) !== -1;
  }

  function evaluateSpecialFilterVisibility(_definition, _inputs) {
    var alleKnown = _inputs.alleKnown === true;
    var alleAllowed = _inputs.alleAllowed === true;
    var rightKnown = _inputs.rightKnown === true;
    var rightAllowed = _inputs.rightAllowed === true;
    var activeSichtValue = normalizeSichtValue(_inputs.activeSichtValue);
    var isVisibleForSicht = isSichtCompatible(_definition, activeSichtValue);
    var isVisible = rightKnown && rightAllowed && isVisibleForSicht;
    var shouldApplyDefault =
      isVisible &&
      alleKnown &&
      !alleAllowed &&
      _inputs.hasDefaultOption === true;
    var shouldClearHidden =
      rightKnown &&
      (!rightAllowed || (activeSichtValue && !isVisibleForSicht));
    var rightsUnknown = !alleKnown || !rightKnown;
    return {
      alleAllowed: alleAllowed,
      rightAllowed: rightAllowed,
      isVisibleForSicht: isVisibleForSicht,
      isVisible: isVisible,
      shouldApplyDefault: shouldApplyDefault,
      shouldClearHidden: shouldClearHidden,
      rightsUnknown: rightsUnknown
    };
  }

  return {
    dispatchInternal: dispatchInternal,
    scheduleSync: scheduleSync,
    evaluateSpecialFilterVisibility: evaluateSpecialFilterVisibility // also exported for tools/tests
  };
});
