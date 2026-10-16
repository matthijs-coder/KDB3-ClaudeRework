define([
  "../config/actionTypes.js",
  "../config/parameterSetCodes.js",
  "./guardParameterSetRun.js",
  "../slots.js",
  "../effects/applyParameterSetTabsToCognos.js",
  "./readResolvedFilterScopeTargets.js",
], function (_actionTypes, _codes, _guard, _slots, _applyToCognos, _readResolvedFilterScopeTargets) {
  "use strict";

  // tabs/parameterSetRestoreRequested per
  // contracts/tabs-parameterSetRestore-contractdelta.md §3/§4. Applies the
  // saved v3 tabs prefix (name + visibility) onto the fixed dashboard slots
  // in one atomic reducer commit, then syncs Cognos titles/DOM and returns
  // the tabIdx -> { tabId, pageId, scopeId?, visible } lookup.
  async function parameterSetRestore(_ctx, _payload) {
    const payload = _payload || {};
    const guardResult = _guard.guardParameterSetRun(_ctx._KDB, payload, { requireHydratedTabs: true });
    if (guardResult) { return withTargets(guardResult, null); }

    const savedTabs = Array.isArray(payload.tabs) ? payload.tabs : null;
    const slots = _slots.listDashboardSlots(_ctx.getRawState());
    const invalidEntry = savedTabs === null || savedTabs.some(function (entry) {
      return !entry || typeof entry.name !== "string" || entry.name === "";
    });
    if (invalidEntry) {
      return fail(_codes.TARGET_MISSING, "payload.tabs must be an array of { name, hide? } entries with non-empty names");
    }
    if (savedTabs.length > slots.length) {
      return fail(_codes.TARGET_MISSING,
        "saved tab count " + savedTabs.length + " exceeds physical dashboard slot count " + slots.length);
    }

    // Delta §4 rule 2 / T2-5a: settle in-flight startup/traverse work first so
    // restore cannot commit names/visibility while startup clicks are still running.
    await _guard.waitForInflightTraversals(_ctx._KDB);
    if (_guard.isStale(_ctx._KDB, payload.runId)) { return withTargets(_guard.cancelledResult(), null); }

    const diagnostics = [];
    const entries = savedTabs.map(function (saved, tabIdx) {
      return { physicalIndex: slots[tabIdx].index, tabIdx: tabIdx, name: saved.name, visible: saved.hide !== 1 };
    });
    for (let tabIdx = savedTabs.length; tabIdx < slots.length; tabIdx += 1) {
      diagnostics.push({
        code: _codes.SURPLUS_UNTOUCHED, tabIdx: tabIdx,
        message: "physical dashboard tab " + slots[tabIdx].index + " has no saved v3 entry and stays untouched"
      });
    }
    enforceMinVisible(entries, slots, savedTabs.length, diagnostics);

    _ctx.dispatch({ type: _actionTypes.PARAMETER_SET_APPLY, payload: { entries: entries, source: payload.source || "writebackSet" } });
    _applyToCognos(_ctx, entries).forEach(function (diagnostic) { diagnostics.push(diagnostic); });

    const resolved = _readResolvedFilterScopeTargets(_ctx, { source: payload.source || "writebackSet" });
    if (resolved.ok !== true) {
      return {
        ok: false,
        tabTargets: null,
        diagnostics: diagnostics.concat(resolved.diagnostics)
      };
    }
    return {
      ok: true,
      tabTargets: resolved.tabTargets,
      diagnostics: diagnostics.concat(resolved.diagnostics)
    };
  }

  // Delta §4 rule 6: at least one visible dashboard tab across the resulting
  // state (saved prefix plus untouched surplus slots).
  function enforceMinVisible(entries, slots, savedCount, diagnostics) {
    const anyRestoredVisible = entries.some(function (entry) { return entry.visible === true; });
    const anySurplusVisible = slots.slice(savedCount).some(function (tab) { return tab.visible === true; });
    if (anyRestoredVisible || anySurplusVisible || slots.length === 0) { return; }
    if (entries.length > 0) {
      entries[0].visible = true;
    } else {
      entries.push({ physicalIndex: slots[0].index, tabIdx: 0, visible: true });
    }
    diagnostics.push({
      code: _codes.MIN_VISIBLE_FORCED, tabIdx: 0,
      message: "all restorable dashboard tabs were hidden; first dashboard tab forced visible"
    });
  }

  function fail(code, message) {
    return { ok: false, tabTargets: null, diagnostics: [{ code: code, message: message }] };
  }

  function withTargets(result, tabTargets) {
    return Object.assign({ tabTargets: tabTargets }, result);
  }

  return parameterSetRestore;
});
