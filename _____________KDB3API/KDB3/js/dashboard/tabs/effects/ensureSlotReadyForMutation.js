define([
  "../config/actionTypes.js",
  "../actions/guardParameterSetRun.js"
], function (_actionTypes, _guardParameterSetRun) {
  "use strict";

  async function ensureSlotReadyForMutation(_ctx, _slot, _runContext) {
    try {
      var slot = _slot || {};
      if (!slot.tabId) {
        return { ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "Missing slot tabId for mutation readiness." }] };
      }
      if (slot.hasBeenActivated !== true) {
        // N1: record that a real traverse click happened (already-activated
        // slots never reach this branch), so the abort restore knows it must
        // physically re-activate regardless of the state mirror.
        if (_runContext) { _runContext.didActivate = true; }
        var activation = await activateSlot(_ctx, slot.index);
        if (activation !== true) {
          return { ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "Failed to activate target slot before mutation." }] };
        }
      }
      var result = await _ctx._KDB.api.widgetBase.dispatch({
        type: "widgetBase/ensureTabWidgetsRouted",
        payload: { tabId: slot.tabId, reason: "tabsMutation" }
      });
      if (result && result.ok === true) { return { ok: true, diagnostics: [] }; }
      return { ok: false, diagnostics: [].concat(result && result.diagnostics || []) };
    } catch (err) {
      return { ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: String(err && err.message ? err.message : err) }] };
    }
  }

  // Shared activation path (pattern parameterSetActivateTab.js): settle
  // in-flight startup/user traversals first so the traverse coalescing guard
  // cannot reject the mutation's activation with TABS_TRAVERSE_CONFLICT (M5).
  async function activateSlot(_ctx, tabIndex) {
    await _guardParameterSetRun.waitForInflightTraversals(_ctx._KDB);
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

  // Execution-spec step 1b (master delta §2.3 phase 2): every abort path
  // that ends before commit must leave the user on the originally active
  // tab, because the readiness activations above are mechanical and visible.
  // Best-effort: failures are logged, never thrown (the abort MutationResult
  // is already being resolved).
  async function restoreOriginalActiveTab(_ctx, _runContext) {
    try {
      var runContext = _runContext || {};
      var original = runContext.originalActive || {};
      if (typeof original.index !== "number") { return false; }
      // N1: state.activeIndex is only a debounced observer mirror
      // (observeActiveTab, 120ms) and the mechanical restoreActiveTab:false
      // traversals deliberately do not write it. After a real activation
      // click always re-activate (the traverse is idempotent); the mirror
      // no-op shortcut is only safe when nothing was clicked.
      if (runContext.didActivate !== true) {
        var state = _ctx.getRawState() || {};
        if (state.activeIndex === original.index) { return true; }
      }
      var activation = await activateSlot(_ctx, original.index);
      return activation === true;
    } catch (err) {
      console.warn("[tabs.ensureSlotReadyForMutation] restore of original active tab after abort failed", err);
      return false;
    }
  }

  ensureSlotReadyForMutation.restoreOriginalActiveTab = restoreOriginalActiveTab;
  return ensureSlotReadyForMutation;
});
