define([
  "../config/actionTypes.js",
  "./syncTabsDomFromState.js",
  "./syncTabsKdbControlReadView.js"
], function (_actionTypes, _syncTabsDomFromState, _syncTabsKdbControlReadView) {
  "use strict";

  async function applyTabMutationToCognos(_ctx, _plan, _runContext) {
    var diagnostics = [];
    try {
      var state = _ctx.getRawState() || {};
      var byIndex = state.byIndex || {};
      var names = _plan && _plan.names && _plan.names.byIndexAfter || {};
      var indexKeys = Object.keys(names);
      var keyIndex = 0;
      while (keyIndex < indexKeys.length) {
        var indexKey = indexKeys[keyIndex];
        var tab = byIndex[indexKey];
        // No name comparison here: this runs post-commit, so state names already
        // equal the plan targets — comparing would skip every Cognos rename.
        // byIndexAfter only lists slots the plan renames; setTabName is idempotent.
        if (tab) {
          try {
            await _ctx.adapter.setTabName({ pageId: tab.pageId || tab.tabId }, names[indexKey]);
          } catch (err) {
            diagnostics.push({ code: "TABS_RENAME_FAILED", index: Number(indexKey), message: String(err && err.message ? err.message : err) });
          }
        }
        keyIndex += 1;
      }
      _syncTabsDomFromState(_ctx._KDB, _ctx.getRawState());
      _syncTabsKdbControlReadView(_ctx._KDB);
      await _ctx.dispatch({
        type: _actionTypes.TRAVERSE,
        payload: {
          source: "tabsMutation",
          scope: "singleTab",
          tabIndex: _plan.landing.index,
          includeHiddenDashboardTabs: true,
          restoreActiveTab: false,
          waitFor: "canvas"
        }
      });
      return { status: diagnostics.length > 0 ? "degraded" : "ok", diagnostics: diagnostics };
    } catch (err) {
      diagnostics.push({ code: "TABS_RENAME_FAILED", message: String(err && err.message ? err.message : err) });
      return { status: "degraded", diagnostics: diagnostics };
    }
  }

  return applyTabMutationToCognos;
});
