define([
  "../state.js",
  "../config.js",
  "../selectors.js",
  "../../../../core/utils/kit/runtime.js",
  "../effects/hostScope/apply.js",
  "../effects/hostScope/clear.js",
  "../effects/reconcile/runReconcile.js",
  "../effects/reconcile/defaults.js",
  "../effects/sichtSync.js",
  "./scopeTargets.js",
  "./hierarchyIndex.js",
  "./scopePlan.js"
], function (
  _state,
  _config,
  _selectors,
  _kitRuntime,
  _applyScope,
  _clearScope,
  _runReconcile,
  _defaults,
  _sichtSync,
  _scopeTargets,
  _hierarchyIndex,
  _scopePlan
) {
  "use strict";

  var CODES = _config.PARAMETER_SET_CODES;
  var ACTIONS = _state.ACTIONS;

  function isParameterSetAction(_type) {
    return _type === ACTIONS.PARAMETER_SET_CLEAR_REQUESTED || _type === ACTIONS.PARAMETER_SET_RESTORE_REQUESTED;
  }

  function disposedResult() {
    return Promise.resolve({
      ok: false,
      appliedScopes: [],
      fallbackScopes: [],
      missingValues: [],
      diagnostics: [{ code: CODES.CANCELLED, message: "dienststelle controller is disposed" }]
    });
  }

  function reconcile(_controller, _dispatchInternal, _context) {
    return _runReconcile.runReconcile(_controller._KDB, _dispatchInternal, _runReconcile.reconcileConfirmed, _context || {});
  }

  function readActiveSichtValue(_controller) {
    var context = _selectors.readActiveDienststelleContext(_controller._KDB);
    return context && context.activeSichtValue ? String(context.activeSichtValue) : null;
  }

  function readActiveFilterKey(_controller) {
    var context = _selectors.readActiveDienststelleContext(_controller._KDB);
    return context && context.activeFilterKey ? String(context.activeFilterKey) : null;
  }

  function guardRun(_controller, _payload) {
    var runId = _payload && _payload.runId;
    var runtime;
    if (typeof runId !== "number" || !isFinite(runId)) {
      return {
        ok: false,
        diagnostics: [{ code: CODES.CANCELLED, message: "dienststelle parameterSet action requires a numeric runId" }]
      };
    }
    _controller.runtime = _controller.runtime ||
      _kitRuntime.ensureRuntime(_controller._KDB, "dienststelle", _config.createRuntimeDefaults());
    runtime = _controller.runtime;
    if (typeof runtime.parameterSetRunId === "number" && runId < runtime.parameterSetRunId) {
      return {
        ok: false,
        diagnostics: [{
          code: CODES.CANCELLED,
          message: "stale parameterSet runId " + runId + " superseded by " + runtime.parameterSetRunId
        }]
      };
    }
    runtime.parameterSetRunId = runId;
    return null;
  }

  function isStale(_controller, _runId) {
    var runtime = _controller.runtime;
    return !!(runtime && typeof runtime.parameterSetRunId === "number" && _runId < runtime.parameterSetRunId);
  }

  function createParameterSetContext(_controller, _dispatch, _dispatchInternal) {
    return {
      _KDB: _controller._KDB,
      filtersFacet: _controller.filtersFacet,
      dispatch: _dispatch,
      dispatchInternal: _dispatchInternal,
      reconcile: reconcile.bind(null, _controller, _dispatchInternal),
      readActiveSichtValue: readActiveSichtValue.bind(null, _controller),
      readActiveFilterKey: readActiveFilterKey.bind(null, _controller),
      guardRun: guardRun.bind(null, _controller),
      isStale: isStale.bind(null, _controller)
    };
  }

  function routeParameterSetAction(_ctx, _action) {
    var action = _action || {};
    var payload = action.payload || {};
    if (action.type === ACTIONS.PARAMETER_SET_CLEAR_REQUESTED) {
      return clearParameterSet(_ctx, payload);
    }
    return restoreParameterSet(_ctx, payload);
  }

  function clearParameterSet(_ctx, _payload) {
    var payload = _payload || {};
    var guard = _ctx.guardRun(payload);
    var diagnostics = [];
    if (guard) {
      return Promise.resolve(guard);
    }
    return Promise.resolve(_clearScope.clearHostFilter(_ctx._KDB, _ctx.readActiveFilterKey(), payload)).then(function (clearResult) {
      // A superseded run must never reconcile after the async clear.
      if (_ctx.isStale(payload.runId)) {
        diagnostics.push({
          code: CODES.CANCELLED,
          message: "stale parameterSet runId was superseded after clear"
        });
        return { ok: false, diagnostics: diagnostics };
      }
      if (!clearResult || clearResult.ok !== true) {
        diagnostics.push({
          code: CODES.FILTER_CLEAR_FAILED,
          message: "dienststelle clear failed for one or more scopes",
          details: clearResult || null
        });
      }
      return Promise.resolve(_ctx.reconcile({
        activeSichtValue: _ctx.readActiveSichtValue(),
        source: "tableData"
      })).then(function () {
        if (payload.status === "newDashboard" && diagnostics.length > 0) {
          return Promise.resolve(_ctx.reconcile({
            activeSichtValue: _ctx.readActiveSichtValue(),
            source: "sync"
          })).then(function () {
            return { ok: true, degraded: true, diagnostics: diagnostics };
          });
        }
        if (payload.status === "newDashboard") {
          return { ok: true, diagnostics: diagnostics };
        }
        return { ok: diagnostics.length === 0, diagnostics: diagnostics };
      });
    }).catch(function (error) {
      return {
        ok: payload.status === "newDashboard",
        degraded: payload.status === "newDashboard",
        diagnostics: [{
          code: CODES.FILTER_CLEAR_FAILED,
          message: "dienststelle clear threw: " + String(error && error.message ? error.message : error)
        }]
      };
    });
  }

  function restoreParameterSet(_ctx, _payload) {
    var payload = _payload || {};
    var guard = _ctx.guardRun(payload);
    if (guard) {
      return Promise.resolve(Object.assign({ appliedScopes: [], fallbackScopes: [], missingValues: [] }, guard));
    }
    return runRestore(_ctx, payload);
  }

  function waitForRestoreTables(_ctx, _active) {
    return _runReconcile.awaitDataReady(_ctx._KDB, [_active.defaultTableKey, _active.hierarchyTableKey]);
  }

  async function runRestore(_ctx, payload) {
    var diagnostics = [];
    var active = _config.resolveDefinition(payload.activeSichtValue);
    var requested = payload.dienststelle || {};
    var timeoutMs = readTimeout(payload);
    var ready;
    var rows;
    var rowCount;
    var index;
    var fallbackValue;
    var plan;
    var applyResult;
    if (!active || requested.key !== active.activeFilterKey) {
      diagnostics.push({ code: CODES.RESTORE_FAILED, message: "active Sicht/filter key mismatch for dienststelle restore" });
      return failedResult(diagnostics);
    }
    _sichtSync.abortPreviousHierarchyWarmup(_ctx._KDB, active);
    ready = await _scopeTargets.waitForData(waitForRestoreTables.bind(null, _ctx, active), timeoutMs);
    if (!ready || _ctx.isStale(payload.runId)) {
      return cancelledOrTimeout(_ctx, payload.runId, diagnostics);
    }
    rows = _scopeTargets.readRows(_ctx._KDB, active.hierarchyTableKey);
    rowCount = Array.isArray(rows) ? rows.length : 0;
    index = _hierarchyIndex.buildHierarchyIndex(rows);
    fallbackValue = _defaults.readDefaultValue(_ctx._KDB, active.defaultTableKey);
    if (rowCount === 0) {
      diagnostics.push({ code: CODES.RESTORE_FAILED, message: "hierarchy table is ready but has zero rows" });
    }
    plan = _scopePlan.buildRestoreScopePlan(_ctx, payload, index, rowCount, fallbackValue, diagnostics);
    if (_ctx.isStale(payload.runId)) { return cancelledOrTimeout(_ctx, payload.runId, diagnostics); }
    await _clearScope.deactivateInactiveVariants(_ctx._KDB, _ctx.dispatchInternal, active);
    if (_ctx.isStale(payload.runId)) { return cancelledOrTimeout(_ctx, payload.runId, diagnostics); }
    applyResult = await applyRestorePlan(_ctx, active, plan, diagnostics);
    if (_ctx.isStale(payload.runId)) { return cancelledOrTimeout(_ctx, payload.runId, diagnostics); }
    commitActiveDefinition(_ctx, active);
    if (applyResult.requiredOk) {
      await _ctx.reconcile({ activeSichtValue: active.activeSichtValue, source: "tableData" });
    }
    return {
      ok: applyResult.requiredOk,
      degraded: applyResult.fallbackScopes.length > 0 || applyResult.missingValues.length > 0 ||
        hasDisplayDegraded(diagnostics),
      appliedScopes: applyResult.appliedScopes,
      fallbackScopes: applyResult.fallbackScopes,
      missingValues: applyResult.missingValues,
      diagnostics: diagnostics
    };
  }

  function describeWriteFailure(_outcome) {
    if (!_outcome) { return "writeFilter returned nothing"; }
    if (_outcome.diagnostics && _outcome.diagnostics[0] && _outcome.diagnostics[0].message) {
      return _outcome.diagnostics[0].message;
    }
    return String(_outcome.errorCode || _outcome.reason || _outcome.outcome);
  }

  // Writes the validated plan values per scope via the cognosHost filters facet.
  async function applyRestorePlan(_ctx, _active, _plan, _diagnostics) {
    var filtersFacet = _ctx.filtersFacet;
    var result = { requiredOk: true, appliedScopes: [], fallbackScopes: [], missingValues: [] };
    var idx;
    var item;
    var ref;
    var values;
    var outcome;
    if (!filtersFacet) {
      _diagnostics.push({ code: CODES.RESTORE_FAILED, message: "dienststelle cognos filter API is unavailable" });
      return { requiredOk: false, appliedScopes: [], fallbackScopes: [], missingValues: [] };
    }
    for (idx = 0; idx < _plan.length; idx += 1) {
      item = _plan[idx];
      ref = _scopeTargets.lookupScopeFilterRef(_ctx._KDB, _active.activeFilterKey, item.scope);
      if (!ref) {
        result.requiredOk = item.scope !== "global" && result.requiredOk;
        if (item.scope === "global") { break; }
        continue;
      }
      result.missingValues = result.missingValues.concat(item.missing);
      values = item.valid.length ? item.valid : item.fallback ? [item.fallback] : [];
      if (values.length === 0) {
        result.requiredOk = item.scope !== "global" && result.requiredOk;
        if (item.scope === "global") { break; }
        continue;
      }
      outcome = await filtersFacet.writeFilter({
        ref: ref,
        values: _applyScope.toCognosValues(values)
      });
      if (!outcome || outcome.ok !== true) {
        _diagnostics.push({
          code: CODES.RESTORE_FAILED,
          scope: item.scope,
          message: "cognos apply failed: " + describeWriteFailure(outcome)
        });
        result.requiredOk = item.scope !== "global" && result.requiredOk;
        if (item.scope === "global") { break; }
        continue;
      }
      if (item.valid.length > 0) { result.appliedScopes.push(item.scope); }
      else { result.fallbackScopes.push(item.scope); }
    }
    return result;
  }

  function hasDisplayDegraded(_diagnostics) {
    return _diagnostics.some(function (diagnostic) {
      return !!diagnostic && diagnostic.code === CODES.RESTORE_DISPLAY_DEGRADED;
    });
  }

  // Reducer-only commit, so the restore does not depend on reconcile side effects for the active
  // definition fields. No Cognos writes happen here.
  function commitActiveDefinition(_ctx, _active) {
    _ctx.dispatchInternal({
      type: ACTIONS.SICHT_CHANGED,
      payload: {
        activeSichtValue: _active.activeSichtValue,
        activeFilterKey: _active.activeFilterKey,
        visibleFilterLabel: _active.visibleFilterLabel,
        activeHierarchyTableKey: _active.hierarchyTableKey,
        activeDefaultTableKey: _active.defaultTableKey,
        observedAt: Date.now()
      }
    });
  }

  function readTimeout(_payload) {
    return _payload.options && _payload.options.hierarchyWaitTimeoutMs > 0
      ? _payload.options.hierarchyWaitTimeoutMs : 60000;
  }

  function cancelledOrTimeout(_ctx, _runId, _diagnostics) {
    var stale = _ctx.isStale(_runId);
    _diagnostics.push({
      code: stale ? CODES.CANCELLED : CODES.RESTORE_FAILED,
      message: stale ? "stale parameterSet runId was superseded" : "hierarchy/default data wait timed out"
    });
    return failedResult(_diagnostics);
  }

  function failedResult(_diagnostics) {
    return { ok: false, appliedScopes: [], fallbackScopes: [], missingValues: [], diagnostics: _diagnostics };
  }

  return {
    isParameterSetAction: isParameterSetAction,
    disposedResult: disposedResult,
    createParameterSetContext: createParameterSetContext,
    routeParameterSetAction: routeParameterSetAction
  };
});
