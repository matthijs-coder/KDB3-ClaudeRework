define([
  "../../config/actions.js",
  "../../config/parameterSetCodes.js",
  "../../effects/resolveDienststelleDataKey.js",
  "../../effects/awaitDienststelleDataReady.js",
  "../../effects/abortPreviousHierarchyWarmup.js",
  "../../effects/readDefaultDienststelleValue.js",
  "../restoreSupport.js",
  "./buildDienststelleHierarchyIndex.js",
  "./buildRestoreScopePlan.js",
  "./applyRestorePlan.js"
], function (
  _actionTypes, _codes, _resolveDataKey, _awaitDataReady, _abortPreviousHierarchyWarmup,
  _readDefault, _support, _hierarchyIndex, _buildRestoreScopePlan, _applyRestorePlan
) {
  "use strict";

  function parameterSetRestore(_ctx, _payload) {
    var payload = _payload || {};
    var guard = _ctx.guardRun(payload);
    if (guard) { return Promise.resolve(withDetails(guard)); }
    return runRestore(_ctx, payload);
  }

  function waitForRestoreTables(_ctx, _active) {
    return _awaitDataReady(_ctx._KDB, [_active.defaultTableKey, _active.hierarchyTableKey]);
  }

  async function runRestore(_ctx, payload) {
    var diagnostics = [];
    var active;
    var requested;
    var timeoutMs;
    var ready;
    var rows;
    var rowCount;
    var index;
    var fallbackValue;
    var plan;
    var applyResult;
    try {
      active = _resolveDataKey(payload.activeSichtValue);
      requested = payload.dienststelle || {};
      timeoutMs = readTimeout(payload);
      if (!active || requested.key !== active.activeFilterKey) {
        diagnostics.push({ code: _codes.RESTORE_FAILED, message: "active Sicht/filter key mismatch for dienststelle restore" });
        return fail(diagnostics);
      }
      _abortPreviousHierarchyWarmup(_ctx._KDB, active);
      ready = await _support.waitForData(
        waitForRestoreTables.bind(null, _ctx, active),
        timeoutMs
      );
      if (!ready || _ctx.isStale(payload.runId)) {
        return cancelledOrTimeout(_ctx, payload.runId, diagnostics);
      }
      rows = _support.readRows(_ctx._KDB, active.hierarchyTableKey);
      rowCount = Array.isArray(rows) ? rows.length : 0;
      index = _hierarchyIndex.buildHierarchyIndex(rows);
      fallbackValue = _readDefault(_ctx._KDB, active.defaultTableKey);
      if (rowCount === 0) {
        diagnostics.push({ code: _codes.RESTORE_FAILED, message: "hierarchy table is ready but has zero rows" });
      }
      plan = _buildRestoreScopePlan(_ctx, payload, index, rowCount, fallbackValue, diagnostics);
      if (_ctx.isStale(payload.runId)) { return cancelledOrTimeout(_ctx, payload.runId, diagnostics); }
      await _support.realignInactiveVariants(_ctx._KDB, _ctx.dispatchInternal, active);
      if (_ctx.isStale(payload.runId)) { return cancelledOrTimeout(_ctx, payload.runId, diagnostics); }
      applyResult = await _applyRestorePlan(_ctx, active, plan, diagnostics);
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
    } catch (error) {
      console.error("[dienststelle.runRestore] failed", { runId: payload && payload.runId }, error);
      throw error;
    }
  }

  function hasDisplayDegraded(diagnostics) {
    var idx;
    for (idx = 0; idx < diagnostics.length; idx += 1) {
      if (diagnostics[idx] && diagnostics[idx].code === _codes.RESTORE_DISPLAY_DEGRADED) {
        return true;
      }
    }
    return false;
  }

  // Explicit state commit (review D3): reducer-only SICHT_CHANGED dispatch so
  // the restore path does not depend on reconcile side effects for the active
  // definition fields. No Cognos writes happen here.
  function commitActiveDefinition(_ctx, active) {
    try {
      _ctx.dispatchInternal({
        type: _actionTypes.SICHT_CHANGED,
        payload: {
          activeSichtValue: active.activeSichtValue,
          activeFilterKey: active.activeFilterKey,
          visibleFilterLabel: active.visibleFilterLabel,
          activeHierarchyTableKey: active.hierarchyTableKey,
          activeDefaultTableKey: active.defaultTableKey,
          observedAt: Date.now()
        }
      });
    } catch (error) {
      console.error("[dienststelle.commitActiveDefinition] failed", error);
      throw error;
    }
  }

  function readTimeout(payload) {
    return payload.options && payload.options.hierarchyWaitTimeoutMs > 0
      ? payload.options.hierarchyWaitTimeoutMs : 60000;
  }
  function cancelledOrTimeout(_ctx, runId, diagnostics) {
    diagnostics.push({
      code: _ctx.isStale(runId) ? _codes.CANCELLED : _codes.RESTORE_FAILED,
      message: _ctx.isStale(runId) ? "stale parameterSet runId was superseded" : "hierarchy/default data wait timed out"
    });
    return fail(diagnostics);
  }
  function fail(diagnostics) {
    return { ok: false, appliedScopes: [], fallbackScopes: [], missingValues: [], diagnostics: diagnostics };
  }
  function withDetails(result) {
    return Object.assign({ appliedScopes: [], fallbackScopes: [], missingValues: [] }, result);
  }

  return parameterSetRestore;
});
