define([
  "../config/parameterSetCodes.js",
  "./guardParameterSetRun.js",
  "../slots.js",
  "../effects/ensureSlotReadyForMutation.js",
], function (_codes, _guard, _slots, _ensureSlotReady) {
  "use strict";

  // tabs/parameterSetAbortLandingRequested per
  // contracts/writeback-t2-item5b-contractdelta.md. On SET cancel/fail/abort,
  // land on the pre-run user tab when it is still visible, otherwise the first
  // visible dashboard slot. Reuses mutation restoreOriginalActiveTab (canvas
  // wait, includeHiddenDashboardTabs) so writebackSet never clicks Cognos.
  async function parameterSetAbortLanding(_ctx, _payload) {
    const payload = _payload || {};
    const guardResult = _guard.guardParameterSetRun(_ctx._KDB, payload, { requireHydratedTabs: true });
    if (guardResult) { return guardResult; }

    await _guard.waitForInflightTraversals(_ctx._KDB);
    if (_guard.isStale(_ctx._KDB, payload.runId)) { return _guard.cancelledResult(); }

    const resolved = resolveAbortLanding(_ctx, payload);
    if (resolved.landingIndex === null) {
      return { ok: true, diagnostics: [] };
    }
    const original = payload.originalActive || {};
    const restored = await _ensureSlotReady.restoreOriginalActiveTab(_ctx, {
      originalActive: { index: resolved.landingIndex, tabId: original.tabId || null },
      didActivate: resolved.didActivate
    });
    if (restored !== true) {
      return {
        ok: false,
        diagnostics: [{ code: _codes.TRAVERSAL_FAILED, message: "abort landing click failed" }]
      };
    }
    return { ok: true, diagnostics: [] };
  }

  function resolveAbortLanding(_ctx, payload) {
    const original = payload.originalActive || {};
    const originalIndex = typeof original.index === "number" ? original.index : null;
    if (originalIndex === null) {
      return { landingIndex: null, didActivate: false };
    }
    const slots = _slots.listDashboardSlots(_ctx.getRawState());
    let originalSlot = null;
    let firstVisible = null;
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      if (!slot) { continue; }
      if (slot.index === originalIndex) { originalSlot = slot; }
      if (firstVisible === null && slot.visible === true) { firstVisible = slot; }
    }
    if (originalSlot && originalSlot.visible === true) {
      return { landingIndex: originalIndex, didActivate: payload.didActivate === true };
    }
    if (!firstVisible) {
      return { landingIndex: null, didActivate: false };
    }
    return { landingIndex: firstVisible.index, didActivate: true };
  }

  return parameterSetAbortLanding;
});
