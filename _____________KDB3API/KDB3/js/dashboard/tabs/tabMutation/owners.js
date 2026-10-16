define([
  "../config/actionTypes.js",
  "../config/mutationCodes.js",
  "../config.js",
  "../slots.js",
  "../events/eventNames.js",
  "../restore/guard.js",
  "../../../core/utils/filters/tabMutationRun/tabMutationSnapshots.js"
], function (_actionTypes, _codes, _config, _slots, _eventNames, _guard, _snapshots) {
  "use strict";

  // The owner side of a tab mutation run: dispatching one phase to the filter and widget owners, slot readiness
  // (every affected tab must be activated and routed first), rollback, host resync and snapshot cleanup.

  function ok() {
    return { status: "ok", diagnostics: [] };
  }

  function failed(diag) {
    return { status: "failed", diagnostics: [].concat(diag || []) };
  }

  async function dispatchOwner(_KDB, _owner, _type, _plan, _runContext) {
    const ownerApi = _KDB.api && _KDB.api[_owner];
    if (!ownerApi || typeof ownerApi.dispatch !== "function") { return ownerUnavailable(_owner); }
    const payload = Object.assign({
      plan: _plan,
      runId: _runContext.runId,
      operationId: _runContext.operationId,
      source: "tabsMutation",
      skipHistory: true
    }, buildOwnerPayload(_owner, _runContext));
    try {
      const result = await ownerApi.dispatch({ type: _type, payload: payload });
      return result ? result : ownerUnavailable(_owner);
    } catch (err) {
      return {
        ok: false,
        errorCode: _codes.PREPARE_FAILED,
        diagnostics: [{ code: _codes.PREPARE_FAILED, owner: _owner, message: String(err && err.message ? err.message : err) }]
      };
    }
  }

  function buildOwnerPayload(_owner, _runContext) {
    const runContext = _runContext || {};
    if (_owner === "widgetBase") {
      if (runContext.widgetRebuild === true) { return { widgetRebuild: true, serializedByTabId: runContext.serializedByTabId }; }
      return runContext.serializedByTabId ? { serializedByTabId: runContext.serializedByTabId } : {};
    }
    if (_owner !== "singleSelect" && _owner !== "dienststelle" && _owner !== "nativeMultiSelect") { return {}; }
    return { tabIdxToScopeId: runContext.tabTargets ? runContext.tabTargets : {} };
  }

  function ownerUnavailable(_owner) {
    return {
      ok: false,
      errorCode: _codes.PREPARE_FAILED,
      diagnostics: [{ code: "ownerUnavailable", owner: _owner, message: "Owner API is unavailable in this build wave." }]
    };
  }

  function captureOriginalActive(state) {
    const index = typeof state.activeIndex === "number" ? state.activeIndex : null;
    const tab = index !== null && state.byIndex ? state.byIndex[String(index)] : null;
    return { index: index, tabId: tab && tab.tabId || null };
  }

  function mapTabIdxByTabId(state) {
    const map = {};
    _slots.listDashboardSlots(state).forEach(function (slot, tabIdx) {
      if (slot.tabId) { map[slot.tabId] = tabIdx; }
    });
    return map;
  }

  async function ensureSlots(_ctx, _plan, _runContext) {
    const byIndex = (_ctx.getRawState() || {}).byIndex || {};
    for (let position = 0; position < _plan.affectedTabIds.length; position += 1) {
      const slot = readSlotByTabId(byIndex, _plan.affectedTabIds[position]);
      const result = await ensureSlotReady(_ctx, slot, _runContext);
      if (!result.ok) { return failed(result.diagnostics); }
    }
    return ok();
  }

  function readSlotByTabId(byIndex, tabId) {
    const key = Object.keys(byIndex || {}).find(function (indexKey) { return byIndex[indexKey] && byIndex[indexKey].tabId === tabId; });
    return key === undefined ? null : byIndex[key];
  }

  async function ensureSlotReady(_ctx, _slot, _runContext) {
    const slot = _slot || {};
    if (!slot.tabId) {
      return { ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "Missing slot tabId for mutation readiness." }] };
    }
    try {
      if (slot.hasBeenActivated !== true) {
        // Records that a real traverse click happened (already-activated slots never reach this branch), so the
        // abort restore knows it must physically re-activate regardless of the state mirror.
        if (_runContext) { _runContext.didActivate = true; }
        if (await activateSlot(_ctx, slot.index) !== true) {
          return { ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "Failed to activate target slot before mutation." }] };
        }
      }
      const result = await _ctx._KDB.api.widgetBase.dispatch({
        type: "widgetBase/ensureTabWidgetsRouted",
        payload: { tabId: slot.tabId, reason: "tabsMutation" }
      });
      if (result && result.ok === true) { return { ok: true, diagnostics: [] }; }
      return { ok: false, diagnostics: [].concat(result && result.diagnostics || []) };
    } catch (err) {
      return { ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: String(err && err.message ? err.message : err) }] };
    }
  }

  // Settles in-flight startup and user traversals first, so the traverse coalescing guard cannot reject the
  // mutation's activation with TABS_TRAVERSE_CONFLICT.
  async function activateSlot(_ctx, tabIndex) {
    await _guard.waitForInflightTraversals(_ctx._KDB);
    return _ctx.dispatch({
      type: _actionTypes.TRAVERSE,
      payload: {
        source: "tabsMutation",
        scope: "singleTab",
        tabIndex: tabIndex,
        includeHiddenDashboardTabs: true,
        restoreActiveTab: false,
        waitFor: "canvas"
      }
    });
  }

  // Every abort path that ends before commit must leave the user on the originally active tab, because the
  // readiness activations are mechanical and visible. Best effort: the abort result is already being resolved.
  async function restoreOriginalActiveTab(_ctx, _runContext) {
    const runContext = _runContext || {};
    const original = runContext.originalActive || {};
    if (typeof original.index !== "number") { return false; }
    // state.activeIndex is only a debounced observer mirror and the mechanical restoreActiveTab:false traversals
    // deliberately do not write it. After a real activation click always re-activate (the traverse is
    // idempotent); the no-op shortcut is only safe when nothing was clicked.
    if (runContext.didActivate !== true && (_ctx.getRawState() || {}).activeIndex === original.index) { return true; }
    try {
      return await activateSlot(_ctx, original.index) === true;
    } catch (err) {
      console.warn("[tabs.restoreOriginalActiveTab] restore of the original active tab after abort failed", err);
      return false;
    }
  }

  async function resolveScopeTargets(_ctx, _runContext) {
    const result = await _ctx.dispatch({
      type: _actionTypes.RESOLVE_FILTER_SCOPE_TARGETS,
      payload: { source: "tabsMutation", runId: _runContext.runId, operationId: _runContext.operationId }
    });
    if (!result || result.ok !== true || !result.tabTargets) {
      const diagnostics = result && result.diagnostics || [{ code: _codes.PREPARE_FAILED, message: "Filter scope target resolve failed." }];
      return { tabTargets: null, phase: failed(diagnostics) };
    }
    return { tabTargets: result.tabTargets, phase: ok() };
  }

  async function dispatchOwners(_ctx, _owners, _suffix, _plan, _runContext) {
    const preparedOwners = [];
    const byOwner = {};
    for (let position = 0; position < _owners.length; position += 1) {
      const owner = _owners[position];
      const result = await dispatchOwner(_ctx._KDB, owner, owner + "/" + _suffix, _plan, _runContext);
      if (!result || result.ok !== true) {
        return { preparedOwners: preparedOwners, byOwner: byOwner, phase: failed(result && result.diagnostics) };
      }
      preparedOwners.push(owner);
      byOwner[owner] = result;
    }
    return { preparedOwners: preparedOwners, byOwner: byOwner, phase: ok() };
  }

  async function resyncOwners(_ctx, _owners, _suffix, _plan, _runContext) {
    let diagnostics = [];
    for (let position = 0; position < _owners.length; position += 1) {
      const owner = _owners[position];
      try {
        const result = await dispatchOwner(_ctx._KDB, owner, owner + "/" + _suffix, _plan, _runContext);
        if (result && Array.isArray(result.diagnostics) && result.diagnostics.length > 0) {
          diagnostics = diagnostics.concat(result.diagnostics);
        }
        if (!result || result.ok !== true) {
          diagnostics.push({ code: _codes.HOST_RESYNC_FAILED, owner: owner, message: "host resync owner returned unexpected failure" });
        }
      } catch (err) {
        diagnostics.push({ code: _codes.HOST_RESYNC_FAILED, owner: owner, message: String(err && err.message ? err.message : err) });
      }
    }
    return diagnostics.length === 0 ? ok() : { status: "degraded", diagnostics: diagnostics };
  }

  async function rollbackOwners(_ctx, _owners, _runContext) {
    let diagnostics = [];
    for (let position = 0; position < (_owners || []).length; position += 1) {
      const owner = _owners[position];
      const result = await dispatchOwner(_ctx._KDB, owner, owner + "/restoreTabMutationSnapshot", null, _runContext);
      const clean = result && result.ok === true && (!result.unrecoverable || result.unrecoverable.length === 0);
      if (!clean) {
        diagnostics.push({ code: _codes.ROLLBACK_INCOMPLETE, owner: owner, message: "Owner rollback incomplete or failed." });
        diagnostics = diagnostics.concat(result && result.diagnostics || []);
      }
    }
    return diagnostics.length === 0 ? ok() : { status: "degraded", diagnostics: diagnostics };
  }

  function emitFinalTabsChanged(_ctx, _plan) {
    const events = _ctx._KDB.events;
    if (!events || typeof events.emit !== "function") { return; }
    const state = _ctx.getRawState() || {};
    const tab = state.byIndex && state.byIndex[String(_plan.landing.index)] || {};
    events.emit(_eventNames.CHANGED, {
      tabIndex: _plan.landing.index,
      tabIdx: _plan.landing.tabIdx,
      tabId: tab.tabId || _plan.landing.tabId,
      pageId: tab.pageId || null,
      firstActivation: false,
      source: "tabsMutation"
    });
  }

  // Post-commit cleanup: a failing owner must not turn an applied mutation into a failure.
  function clearSnapshots(_ctx, _operationId) {
    const runtime = _ctx && _ctx._KDB && _ctx._KDB.runtime;
    if (!runtime || _operationId == null || _operationId === "") { return; }
    _config.mutationOwners.SNAPSHOT_OWNER_KEYS.forEach(function (ownerKey) {
      if (!runtime[ownerKey]) { return; }
      try {
        _snapshots.deleteSnapshot(runtime[ownerKey], _operationId);
      } catch (err) {
        console.error("[tabs.clearSnapshots] owner cleanup failed", { owner: ownerKey, operationId: _operationId }, err);
      }
    });
  }

  return {
    ok: ok,
    failed: failed,
    dispatchOwner: dispatchOwner,
    captureOriginalActive: captureOriginalActive,
    mapTabIdxByTabId: mapTabIdxByTabId,
    ensureSlots: ensureSlots,
    restoreOriginalActiveTab: restoreOriginalActiveTab,
    resolveScopeTargets: resolveScopeTargets,
    dispatchOwners: dispatchOwners,
    resyncOwners: resyncOwners,
    rollbackOwners: rollbackOwners,
    emitFinalTabsChanged: emitFinalTabsChanged,
    clearSnapshots: clearSnapshots
  };
});
