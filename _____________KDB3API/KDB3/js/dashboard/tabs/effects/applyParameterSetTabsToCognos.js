define(["../config/parameterSetCodes.js", "./syncTabsDomFromState.js", "./syncTabsKdbControlReadView.js"], function (_codes, _syncTabsDomFromState, _syncTabsKdbControlReadView) {
  "use strict";

  // Post-commit effect for tabs/parameterSetApply (delta §4 rule 5): pushes
  // restored names to Cognos through the tabs adapter and re-syncs tab DOM +
  // kdbControl read view from the committed state. Never mutates state itself.
  // Cognos title failures are non-fatal per delta §4: committed state/DOM
  // already carry the restored name. This effect stays synchronous for
  // restore/reset callers; missing-adapter throws become diagnostics, and
  // thenable facet failures are warned (host write still runs same-turn).
  function applyParameterSetTabsToCognos(_ctx, _entries) {
    const diagnostics = [];
    const state = _ctx.getRawState() || {};
    const byIndex = state.byIndex || {};

    (_entries || []).forEach(function (entry) {
      if (typeof entry.name !== "string" || entry.name === "") { return; }
      const tab = byIndex[String(entry.physicalIndex)];
      const titleId = tab && (tab.pageId || tab.tabId);
      if (!titleId) { return; }
      try {
        var pending = _ctx.adapter.setTabName({ pageId: titleId }, entry.name);
        if (pending && typeof pending.then === "function") {
          pending.then(null, function (err) {
            console.warn("[tabs.applyParameterSetTabsToCognos] Cognos setTabName failed", err);
          });
        }
      } catch (err) {
        diagnostics.push({
          code: _codes.RENAME_FAILED,
          tabIdx: entry.tabIdx,
          message: "Cognos setTabName failed for physical tab " + entry.physicalIndex +
            ": " + (err && err.message ? err.message : String(err))
        });
      }
    });

    if (!_ctx.isDisposed()) {
      _syncTabsDomFromState(_ctx._KDB, _ctx.getRawState());
      _syncTabsKdbControlReadView(_ctx._KDB);
    }
    return diagnostics;
  }

  return applyParameterSetTabsToCognos;
});
