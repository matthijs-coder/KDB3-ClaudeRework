define([
  "../config/actionTypes.js",
  "../config.js",
  "../actions/guardParameterSetRun.js",
  "../slots.js",
  "../effects/syncTabsDomFromState.js",
  "../effects/syncTabsKdbControlReadView.js",
  "./filterScopeTargets.js",
  "./parameterSetActivation.js",
  "./parameterSetLanding.js"
], function (_actionTypes, _config, _guard, _slots, _syncTabsDomFromState, _syncTabsKdbControlReadView, _filterScopeTargets, _activation, _landing) {
  "use strict";

  const _codes = _config.parameterSetCodes;

  // Public tabs parameterSet* dispatch surface (contracts/tabs-parameterSetRestore-contractdelta.md).
  // Every handler resolves { ok, ..., diagnostics }.
  const HANDLERS = {};
  HANDLERS[_actionTypes.PARAMETER_SET_RESTORE] = parameterSetRestore;
  HANDLERS[_actionTypes.PARAMETER_SET_RESET] = parameterSetReset;
  HANDLERS[_actionTypes.PARAMETER_SET_ACTIVATE_TAB] = _activation.parameterSetActivateTab;
  HANDLERS[_actionTypes.PARAMETER_SET_ABORT_LANDING] = _landing.parameterSetAbortLanding;
  HANDLERS[_actionTypes.RESOLVE_FILTER_SCOPE_TARGETS] = _filterScopeTargets.resolveFilterScopeTargets;
  HANDLERS[_actionTypes.WRITEBACK_GET_PERSIST_LANDING] = _landing.writebackGetPersistLanding;
  HANDLERS[_actionTypes.POST_PARAMETER_SET_RESTORE_TRAVERSE] = _landing.postParameterSetRestoreTraverse;

  function isParameterSetAction(type) {
    return Object.prototype.hasOwnProperty.call(HANDLERS, type);
  }

  function routeParameterSetAction(_ctx, _action) {
    const action = _action || {};
    if (!isParameterSetAction(action.type)) {
      return Promise.resolve({
        ok: false,
        diagnostics: [{ code: "TABS_PARAMETER_SET_UNKNOWN_ACTION", message: "unknown tabs parameterSet action type" }]
      });
    }
    return HANDLERS[action.type](_ctx, action.payload || {});
  }

  // After destroy writebackSet must still get an ok:false acknowledgement (delta §7).
  function disposedResult(type, payload) {
    if (type === _actionTypes.RESOLVE_FILTER_SCOPE_TARGETS) {
      return _filterScopeTargets.disposedResult(payload);
    }
    return Promise.resolve({ ok: false, diagnostics: [{ code: _codes.CANCELLED, message: "tabs controller is disposed" }] });
  }

  // Applies the saved v3 tabs prefix (name + visibility) onto the fixed dashboard slots in one reducer commit,
  // then syncs Cognos titles/DOM and returns the tabIdx -> { tabId, pageId, scopeId?, visible } lookup.
  async function parameterSetRestore(_ctx, payload) {
    const guardResult = _guard.guardParameterSetRun(_ctx._KDB, payload, { requireHydratedTabs: true });
    if (guardResult) { return withTargets(guardResult); }

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

    // Delta §4 rule 2: startup clicks must settle before names/visibility are committed.
    await _guard.waitForInflightTraversals(_ctx._KDB);
    if (_guard.isStale(_ctx._KDB, payload.runId)) { return withTargets(_guard.cancelledResult()); }

    const diagnostics = [];
    const entries = savedTabs.map(function (saved, tabIdx) {
      return { physicalIndex: slots[tabIdx].index, tabIdx: tabIdx, name: saved.name, visible: saved.hide !== 1 };
    });
    for (let tabIdx = savedTabs.length; tabIdx < slots.length; tabIdx += 1) {
      diagnostics.push({
        code: _codes.SURPLUS_UNTOUCHED,
        tabIdx: tabIdx,
        message: "physical dashboard tab " + slots[tabIdx].index + " has no saved v3 entry and stays untouched"
      });
    }
    enforceMinVisible(entries, slots, savedTabs.length, diagnostics);
    return applyEntries(_ctx, payload, entries, diagnostics);
  }

  // newDashboard branch: ignores saved tabs and resets the slots to the baseline names captured at the first
  // syncFromDom (fallback "Tab N") with only the first dashboard slot visible.
  async function parameterSetReset(_ctx, payload) {
    const guardResult = _guard.guardParameterSetRun(_ctx._KDB, payload, { requireHydratedTabs: true });
    if (guardResult) { return withTargets(guardResult); }

    await _guard.waitForInflightTraversals(_ctx._KDB);
    if (_guard.isStale(_ctx._KDB, payload.runId)) { return withTargets(_guard.cancelledResult()); }

    const runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
    const baselineNamesByIndex = runtime && runtime.baselineNamesByIndex || {};
    const entries = _slots.listDashboardSlots(_ctx.getRawState()).map(function (tab, tabIdx) {
      return {
        physicalIndex: tab.index,
        tabIdx: tabIdx,
        name: baselineNamesByIndex[String(tab.index)] || "Tab " + (tab.index + 1),
        visible: tabIdx === 0
      };
    });
    return applyEntries(_ctx, payload, entries, []);
  }

  function applyEntries(_ctx, payload, entries, diagnostics) {
    const source = payload.source || "writebackSet";
    _ctx.dispatch({ type: _actionTypes.PARAMETER_SET_APPLY, payload: { entries: entries, source: source } });
    const allDiagnostics = diagnostics.concat(applyParameterSetTabsToCognos(_ctx, entries));
    const resolved = _filterScopeTargets.readResolvedFilterScopeTargets(_ctx, source);
    return { ok: true, tabTargets: resolved.tabTargets, diagnostics: allDiagnostics.concat(resolved.diagnostics) };
  }

  // Delta §4 rule 6: at least one visible dashboard tab across the saved prefix plus untouched surplus slots.
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
      code: _codes.MIN_VISIBLE_FORCED,
      tabIdx: 0,
      message: "all restorable dashboard tabs were hidden; first dashboard tab forced visible"
    });
  }

  // Post-commit effect (delta §4 rule 5). Title failures are non-fatal because state and DOM already carry
  // the restored name: a synchronous throw becomes a diagnostic, a rejected host promise is only warned.
  function applyParameterSetTabsToCognos(_ctx, entries) {
    const diagnostics = [];
    const byIndex = (_ctx.getRawState() || {}).byIndex || {};
    entries.forEach(function (entry) {
      if (typeof entry.name !== "string" || entry.name === "") { return; }
      const tab = byIndex[String(entry.physicalIndex)];
      const titleId = tab && (tab.pageId || tab.tabId);
      if (!titleId) { return; }
      try {
        const pending = _ctx.adapter.setTabName({ pageId: titleId }, entry.name);
        if (pending && typeof pending.then === "function") {
          pending.then(null, function (err) {
            console.warn("[tabs.applyParameterSetTabsToCognos] Cognos setTabName failed", err);
          });
        }
      } catch (err) {
        diagnostics.push({
          code: _codes.RENAME_FAILED,
          tabIdx: entry.tabIdx,
          message: "Cognos setTabName failed for physical tab " + entry.physicalIndex + ": " + (err && err.message ? err.message : String(err))
        });
      }
    });
    if (!_ctx.isDisposed()) {
      _syncTabsDomFromState(_ctx._KDB, _ctx.getRawState());
      _syncTabsKdbControlReadView(_ctx._KDB);
    }
    return diagnostics;
  }

  function fail(code, message) {
    return { ok: false, tabTargets: null, diagnostics: [{ code: code, message: message }] };
  }

  function withTargets(result) {
    return Object.assign({ tabTargets: null }, result);
  }

  return {
    routeParameterSetAction: routeParameterSetAction,
    isParameterSetAction: isParameterSetAction,
    disposedResult: disposedResult
  };
});
