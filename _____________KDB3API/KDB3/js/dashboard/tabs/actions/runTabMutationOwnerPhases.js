define([
  "../config/actionTypes.js",
  "../config/mutationCodes.js",
  "../config.js",
  "../slots.js",
  "../tabMutation/buildMutationResult.js",
  "../effects/ensureSlotReadyForMutation.js",
  "../effects/dispatchOwnerTabMutation.js",
  "../effects/clearTabMutationSnapshots.js",
  "../events/eventNames.js"
], function (_actionTypes, _codes, _config, _slots, _buildResult, _ensureSlotReady, _dispatchOwner, _clearTabMutationSnapshots, _eventNames) {
  "use strict";

  function ok() { return { status: "ok", diagnostics: [] }; }
  function failed(diag) { return { status: "failed", diagnostics: [].concat(diag || []) }; }

  function captureOriginalActive(state) {
    var index = typeof state.activeIndex === "number" ? state.activeIndex : null;
    var tab = index !== null && state.byIndex ? state.byIndex[String(index)] : null;
    return { index: index, tabId: tab && tab.tabId || null };
  }

  function mapTabIdxByTabId(state) {
    var map = {};
    _slots.listDashboardSlots(state).forEach(function (slot, tabIdx) { if (slot.tabId) { map[slot.tabId] = tabIdx; } });
    return map;
  }

  async function abortOnOriginalTab(_ctx, _runContext, _operationId, _phases) {
    await _ensureSlotReady.restoreOriginalActiveTab(_ctx, _runContext);
    return _buildResult(_operationId, _phases);
  }

  async function ensureSlots(_ctx, _plan, _runContext) {
    var state = _ctx.getRawState() || {};
    var byIndex = state.byIndex || {};
    for (var i = 0; i < _plan.affectedTabIds.length; i += 1) {
      var slot = readSlotByTabId(byIndex, _plan.affectedTabIds[i]);
      var result = await _ensureSlotReady(_ctx, slot, _runContext);
      if (!result.ok) { return failed(result.diagnostics); }
    }
    return ok();
  }

  async function resolveScopeTargets(_ctx, _runContext) {
    var action = {
      type: _actionTypes.RESOLVE_FILTER_SCOPE_TARGETS,
      payload: { source: "tabsMutation", runId: _runContext.runId, operationId: _runContext.operationId }
    };
    var result = await _ctx.dispatch(action);
    if (!result || result.ok !== true || !result.tabTargets) {
      return { tabTargets: null, phase: failed(result && result.diagnostics || [{ code: _codes.PREPARE_FAILED, message: "Filter scope target resolve failed." }]) };
    }
    return { tabTargets: result.tabTargets, phase: ok() };
  }

  async function dispatchOwners(_ctx, _owners, _suffix, _plan, _runContext) {
    var prepared = [];
    var byOwner = {};
    for (var i = 0; i < _owners.length; i += 1) {
      var owner = _owners[i];
      var result = await _dispatchOwner(_ctx._KDB, owner, owner + "/" + _suffix, _plan, _runContext);
      if (!result || result.ok !== true) { return { preparedOwners: prepared, byOwner: byOwner, phase: failed(result && result.diagnostics) }; }
      prepared.push(owner);
      byOwner[owner] = result;
    }
    return { preparedOwners: prepared, byOwner: byOwner, phase: ok() };
  }

  async function resyncOwners(_ctx, _owners, _suffix, _plan, _runContext) {
    var diagnostics = [];
    for (var i = 0; i < _owners.length; i += 1) {
      var owner = _owners[i];
      try {
        var result = await _dispatchOwner(_ctx._KDB, owner, owner + "/" + _suffix, _plan, _runContext);
        if (result && Array.isArray(result.diagnostics) && result.diagnostics.length > 0) {
          diagnostics = diagnostics.concat(result.diagnostics);
        }
        if (!result || result.ok !== true) {
          diagnostics.push({
            code: _codes.HOST_RESYNC_FAILED,
            owner: owner,
            message: "host resync owner returned unexpected failure"
          });
        }
      } catch (err) {
        diagnostics.push({
          code: _codes.HOST_RESYNC_FAILED,
          owner: owner,
          message: String(err && err.message ? err.message : err)
        });
      }
    }
    return diagnostics.length === 0 ? ok() : { status: "degraded", diagnostics: diagnostics };
  }

  async function rollbackOwners(_ctx, _owners, _runContext) {
    var diagnostics = [];
    for (var i = 0; i < (_owners || []).length; i += 1) {
      var owner = _owners[i];
      var result = await _dispatchOwner(_ctx._KDB, owner, owner + "/restoreTabMutationSnapshot", null, _runContext);
      var clean = result && result.ok === true && (!result.unrecoverable || result.unrecoverable.length === 0);
      if (!clean) {
        diagnostics.push({ code: _codes.ROLLBACK_INCOMPLETE, owner: owner, message: "Owner rollback incomplete or failed." });
        diagnostics = diagnostics.concat(result && result.diagnostics || []);
      }
    }
    return diagnostics.length === 0 ? ok() : { status: "degraded", diagnostics: diagnostics };
  }

  function emitFinalTabsChanged(_ctx, _plan) {
    var events = _ctx._KDB.events;
    var state = _ctx.getRawState() || {};
    var tab = state.byIndex && state.byIndex[String(_plan.landing.index)] || {};
    if (!events || typeof events.emit !== "function") { return; }
    events.emit(_eventNames.CHANGED, { tabIndex: _plan.landing.index, tabIdx: _plan.landing.tabIdx, tabId: tab.tabId || _plan.landing.tabId, pageId: tab.pageId || null, firstActivation: false, source: "tabsMutation" });
  }

  function clearTabMutationSnapshots(_ctx, _operationId) {
    try {
      _clearTabMutationSnapshots(_ctx && _ctx._KDB, _operationId);
    } catch (err) {
      console.error("[tabs.clearTabMutationSnapshots] failed", { operationId: _operationId }, err);
    }
  }

  function readSlotByTabId(byIndex, tabId) {
    var keys = Object.keys(byIndex || {});
    for (var i = 0; i < keys.length; i += 1) { var slot = byIndex[keys[i]]; if (slot && slot.tabId === tabId) { return slot; } }
    return null;
  }

  return Object.assign({
    ok: ok,
    failed: failed,
    captureOriginalActive: captureOriginalActive,
    mapTabIdxByTabId: mapTabIdxByTabId,
    abortOnOriginalTab: abortOnOriginalTab,
    ensureSlots: ensureSlots,
    resolveScopeTargets: resolveScopeTargets,
    dispatchOwners: dispatchOwners,
    resyncOwners: resyncOwners,
    rollbackOwners: rollbackOwners,
    emitFinalTabsChanged: emitFinalTabsChanged,
    clearTabMutationSnapshots: clearTabMutationSnapshots
  }, _config.mutationOwners);
});
