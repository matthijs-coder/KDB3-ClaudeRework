define([
  "./blockedResult.js",
  "../../bindingConfig.js",
  "../applyTopNJahrMismatchPin.js",
  "../buildBindingSpec.js",
  "../../../../../core/services/widgetBindingPlan/defaults/normalizeDefaultValue.js",
  "./dispatchTopNCleanupWhenDimensionAbsent.js",
  "./topNGateWaiters.js"
], function (
  _blockedResult,
  _bindingConfig,
  _applyTopNJahrMismatchPin,
  _buildBindingSpec,
  _normalizeDefaultValue,
  _dispatchTopNCleanupWhenDimensionAbsent,
  _waiters
) {
  "use strict";

  function mapTopNPayloadToHelper(_payload) {
    var payload = _payload || {};
    return {
      ok: payload.status === "success",
      applied: payload.status === "success",
      topNResultValues: payload.resultValues || [],
      topNExcludeItemId: payload.excludeItemId != null ? payload.excludeItemId : null,
      error: payload.errorMessage || payload.errorCode || null
    };
  }

  function resolveTopNPrerequisite(_context, _input, _settings, _hierarchySnapshot) {
    var partialSpec;
    var helperListConfig;
    var topNApi;
    if (_normalizeDefaultValue(_settings.dimension) == null) {
      return _dispatchTopNCleanupWhenDimensionAbsent(_context, _input.widgetId).then(returnNull);
    }
    if (_waiters.isDefaultTopNChoice(_settings.topNChoice)) {
      return Promise.resolve(null);
    }
    topNApi = _context._KDB.api && _context._KDB.api.widgetTopN;
    if (!topNApi || typeof topNApi.dispatch !== "function") {
      return Promise.resolve({
        blocked: true,
        result: _blockedResult("deferred", "WIDGET_VIS_TOPN_UNAVAILABLE", "awaiting_topN", _input, { topNUnavailable: true })
      });
    }
    partialSpec = _buildBindingSpec(_context._KDB, Object.assign({}, _input, {
      settings: _settings,
      hierarchySnapshot: _hierarchySnapshot
    }));
    helperListConfig = _bindingConfig.resolveTopNHelperListConfig(_context._KDB, partialSpec.dataConfig);
    if (!helperListConfig) {
      return Promise.resolve({
        blocked: true,
        result: _blockedResult("error", "WIDGET_VIS_TOPN_HELPER_LIST_CONFIG_MISSING", "missing_topN_helper_list_config", _input, {
          topNChoice: _settings.topNChoice,
          kennzahlenTable: partialSpec.dataConfig && partialSpec.dataConfig.kennzahlenTable
        })
      });
    }
    return resolvePin(_input, _context, partialSpec).then(dispatchResolve.bind(null, _context, _input, _settings, _hierarchySnapshot, partialSpec, helperListConfig, topNApi)).catch(catchPin.bind(null, _context, _input));
  }

  function resolvePin(_input, _context, _partialSpec) {
    if (_input.periodPin) {
      return Promise.resolve(_input.periodPin);
    }
    return _applyTopNJahrMismatchPin(_context._KDB, _partialSpec.dataConfig && _partialSpec.dataConfig.kennzahlenTable);
  }

  function dispatchResolve(_context, _input, _settings, _hierarchySnapshot, _partialSpec, _helperListConfig, _topNApi, _periodPin) {
    var payload = _input.payload || {};
    var topNWait = _waiters.waitForTopN(_context._KDB, _input.widgetId, _input.opSeq);
    topNWait.catch(absorbWait);
    return _topNApi.dispatch(buildResolveAction(_input, _settings, _hierarchySnapshot, _partialSpec, _helperListConfig, _periodPin, payload)).then(returnWait.bind(null, topNWait));
  }

  function buildResolveAction(_input, _settings, _hierarchySnapshot, _partialSpec, _helperListConfig, _periodPin, _payload) {
    return {
      type: "widgetTopN/resolveRequested",
      widgetId: _input.widgetId,
      opSeq: _input.opSeq,
      payload: {
        ownerVisId: _input.widgetId,
        topNChoice: _settings.topNChoice,
        jahrFilterValue: _periodPin && _periodPin.jahrFilterValue,
        monatFilterValue: _periodPin && _periodPin.monatFilterValue,
        settingsSnapshot: _settings,
        dataConfig: _partialSpec.dataConfig,
        hierarchySnapshot: _hierarchySnapshot,
        config: Object.assign({}, _partialSpec.config, { topNHelperConfig: _helperListConfig }),
        source: _payload.source || _input.reason || "user",
        isHistoryReplay: _payload.isHistoryReplay === true
      }
    };
  }

  function returnNull() {
    return null;
  }

  function returnWait(_topNWait) {
    return _topNWait;
  }

  function absorbWait() {}

  function catchPin(_context, _input, _err) {
    if (_err && _err.destroyed) {
      throw _err;
    }
    if (_waiters.cancelTopNGateWaiter(_context._KDB, _input.widgetId, _input.opSeq)) {
      /* absorbed cancel rejection */
    }
    if (_err && _err.timedOut === true) {
      throw { timedOut: true, kind: "topN" };
    }
    if (_err && _err.cancelled === true) {
      throw { cancelled: true, kind: "topN" };
    }
    console.error("[widgetVis.resolveTopNPrerequisite] failed", _input.widgetId, _err);
    throw {
      prerequisiteFailed: true,
      kind: "topN",
      errorCode: _err && _err.errorCode ? _err.errorCode : "WIDGET_VIS_BINDING_PREREQUISITE_FAILED",
      errorMessage: String(_err && (_err.errorMessage || _err.message) ? (_err.errorMessage || _err.message) : _err)
    };
  }

  return {
    isDefaultTopNChoice: _waiters.isDefaultTopNChoice,
    waitForTopN: _waiters.waitForTopN,
    cancelTopNGateWaiter: _waiters.cancelTopNGateWaiter,
    rejectAllTopNGateWaiters: _waiters.rejectAllTopNGateWaiters,
    resolveTopNGateWaiter: _waiters.resolveTopNGateWaiter,
    mapTopNPayloadToHelper: mapTopNPayloadToHelper,
    resolveTopNPrerequisite: resolveTopNPrerequisite
  };
});
