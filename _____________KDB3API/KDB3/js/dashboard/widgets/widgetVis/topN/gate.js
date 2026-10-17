define([
  "../binding/gates.js",
  "../binding/spec.js",
  "../bindingConfig.js",
  "../config.js",
  "../results.js",
  "./periodPin.js",
  "../../widgetTopN/selectors.js",
  "../../../../core/utils/normalizeDefaultValue.js",
  "../../../../core/utils/kit/data.js"
], function (_gates, _spec, _bindingConfig, _config, _results, _periodPin, _topNSelectors, _normalizeDefaultValue, _data) {
  "use strict";

  var CLEANUP_STATUSES = ["pending", "success", "error"];

  function isDefaultTopNChoice(_value) {
    if (_value == null || _value === "") {
      return true;
    }
    var normalized = String(_value).toLowerCase();
    return normalized === "none" || normalized === "default";
  }

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

  function matchWaiter(_widgetId, _opSeq) {
    return function (_waiter) {
      return _waiter.widgetId === _widgetId && _waiter.opSeq === _opSeq;
    };
  }

  function resolveTopNGateWaiter(_KDB, _widgetId, _opSeq, _helperTableResult) {
    return _gates.topNWaiters.resolveWhere(_KDB, matchWaiter(_widgetId, _opSeq), _helperTableResult).length > 0;
  }

  // Best effort: a failed cleanup must never block the binding that follows.
  async function dispatchTopNCleanupWhenDimensionAbsent(_context, _widgetId) {
    try {
      var api = _context && _context._KDB && _context._KDB.api ? _context._KDB.api.widgetTopN : null;
      if (!api) {
        return;
      }
      var record = _topNSelectors.readOwnerState(_context._KDB, _widgetId);
      if (!record || CLEANUP_STATUSES.indexOf(record.resolutionStatus) === -1) {
        return;
      }
      await api.dispatch({
        type: "widgetTopN/cleanup",
        widgetId: _widgetId,
        payload: { ownerVisId: _widgetId, reason: "cleanup", clearHelperBinding: true, releaseClaim: false }
      });
    } catch (err) {
      console.error("[widgetVis.dispatchTopNCleanupWhenDimensionAbsent] failed", _widgetId, err);
    }
  }

  function unblocked(_helperTableResult, _spec) {
    return { blocked: false, helperTableResult: _helperTableResult, spec: _spec };
  }

  function buildResolveAction(_input, _settings, _hierarchySnapshot, _spec, _helperListConfig, _periodPin) {
    var payload = _input.payload || {};
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
        // widgetTopN keeps request.dataConfig as lastHelperDataConfig, so it must not alias the plan spec.
        dataConfig: _data.cloneJson(_spec.dataConfig),
        hierarchySnapshot: _hierarchySnapshot,
        config: Object.assign(_data.cloneJson(_spec.config), { topNHelperConfig: _helperListConfig }),
        source: payload.source || _input.reason || "user",
        isHistoryReplay: payload.isHistoryReplay === true
      }
    };
  }

  async function requestHelperResult(_context, _input, _settings, _hierarchySnapshot, _spec, _helperListConfig, _topNApi) {
    var _KDB = _context._KDB;
    var topNWait;
    try {
      var periodPin = _input.periodPin || await _periodPin.applyTopNJahrMismatchPin(_KDB, _spec.dataConfig && _spec.dataConfig.kennzahlenTable);
      topNWait = _gates.topNWaiters.wait(_KDB, {
        widgetId: _input.widgetId,
        opSeq: _input.opSeq,
        timeoutMs: _config.bindingPrerequisiteTimeoutMs,
        timeoutReason: { timedOut: true, kind: "topN" },
        replaceSameWidget: true
      });
      // A dispatch failure leaves this wait unobserved; its later rejection must not surface as unhandled.
      topNWait.catch(function () {});
      await _topNApi.dispatch(buildResolveAction(_input, _settings, _hierarchySnapshot, _spec, _helperListConfig, periodPin));
      return unblocked(await topNWait, _spec);
    } catch (err) {
      throw toPrerequisiteFailure(_KDB, _input, err);
    }
  }

  function toPrerequisiteFailure(_KDB, _input, _err) {
    if (_err && _err.destroyed) {
      return _err;
    }
    _gates.topNWaiters.rejectWhere(_KDB, matchWaiter(_input.widgetId, _input.opSeq), { cancelled: true });
    if (_err && _err.timedOut === true) {
      return { timedOut: true, kind: "topN" };
    }
    if (_err && _err.cancelled === true) {
      return { cancelled: true, kind: "topN" };
    }
    console.error("[widgetVis.resolveTopNPrerequisite] failed", _input.widgetId, _err);
    return {
      prerequisiteFailed: true,
      kind: "topN",
      errorCode: _err && _err.errorCode ? _err.errorCode : "WIDGET_VIS_BINDING_PREREQUISITE_FAILED",
      errorMessage: String(_err && (_err.errorMessage || _err.message) ? (_err.errorMessage || _err.message) : _err)
    };
  }

  // Resolves to {blocked:true, result} or {blocked:false, helperTableResult, spec}; spec is built once here
  // and reused by the pipeline. Rejects with the plain gate protocol objects decoded by resolveBindingPrerequisites.
  async function resolveTopNPrerequisite(_context, _input, _settings, _hierarchySnapshot) {
    var _KDB = _context._KDB;
    if (_normalizeDefaultValue(_settings.dimension) == null) {
      await dispatchTopNCleanupWhenDimensionAbsent(_context, _input.widgetId);
      return unblocked(null, null);
    }
    if (isDefaultTopNChoice(_settings.topNChoice)) {
      return unblocked(null, null);
    }
    var topNApi = _KDB.api && _KDB.api.widgetTopN;
    if (!topNApi) {
      return {
        blocked: true,
        result: _gates.blockedResult("deferred", "WIDGET_VIS_TOPN_UNAVAILABLE", "awaiting_topN", _input, { topNUnavailable: true })
      };
    }
    var spec = _spec.buildBindingSpec(_KDB, Object.assign({}, _input, { settings: _settings, hierarchySnapshot: _hierarchySnapshot }));
    var helperListConfig = _bindingConfig.resolveTopNHelperListConfig(_KDB, spec.dataConfig);
    if (!helperListConfig) {
      return {
        blocked: true,
        result: _gates.blockedResult("error", "WIDGET_VIS_TOPN_HELPER_LIST_CONFIG_MISSING", "missing_topN_helper_list_config", _input, {
          topNChoice: _settings.topNChoice,
          kennzahlenTable: spec.dataConfig && spec.dataConfig.kennzahlenTable
        })
      };
    }
    return requestHelperResult(_context, _input, _settings, _hierarchySnapshot, spec, helperListConfig, topNApi);
  }

  function handleTopNResolved(_context, _action) {
    var payload = _action.payload || {};
    var widgetId = _action.widgetId;
    var opSeq = payload.opSeq != null ? payload.opSeq : _action.opSeq;
    var result;
    if (payload.ownerVisId && payload.ownerVisId !== widgetId) {
      result = { ok: false, widgetId: widgetId, errorCode: "WIDGET_VIS_WIDGET_ID_CONFLICT" };
    } else if (_context.isStaleOpSeq(widgetId, opSeq)) {
      result = { ok: false, widgetId: widgetId, opSeq: opSeq, stale: true };
    } else if (resolveTopNGateWaiter(_context._KDB, widgetId, opSeq, mapTopNPayloadToHelper(payload))) {
      result = { ok: true, widgetId: widgetId, opSeq: opSeq, gateResolved: true };
    } else {
      result = { ok: false, widgetId: widgetId, opSeq: opSeq, skipped: true, errorCode: "WIDGET_VIS_TOPN_NO_WAITER" };
    }
    return Promise.resolve(_results.normalizeDispatchResult(result));
  }

  return {
    isDefaultTopNChoice: isDefaultTopNChoice,
    mapTopNPayloadToHelper: mapTopNPayloadToHelper,
    resolveTopNPrerequisite: resolveTopNPrerequisite,
    handleTopNResolved: handleTopNResolved
  };
});
