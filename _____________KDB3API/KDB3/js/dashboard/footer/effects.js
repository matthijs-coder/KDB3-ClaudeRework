define(["./view.js", "./loadFooterData.js"], function (_view, _loadFooterData) {
  "use strict";

  function syncKdbControlReadView(_KDB, _action, _prevState) {
    var isReplay = !!(_action && _action.options && _action.options.isHistoryReplay === true);
    var isStatusChanged = !!(_prevState && _prevState.status !== _KDB.state.footer.status);
    if (!isReplay && !isStatusChanged) return;
    var kdbControlRuntime = _KDB.runtime.kdbControl;
    var bindContext = kdbControlRuntime && kdbControlRuntime.frameworkBindContext;
    if (bindContext && typeof bindContext.syncView === "function") bindContext.syncView();
  }

  function loadMissingFooterData(_KDB, _action) {
    var state = _KDB.state.footer;
    var isMountSync = !!(_action && _action.type === "__mountSync");
    var isActive = state.status === "active";
    var isUpdateDateMissing = state.aktualisierungsDatumRaw == null && state.aktualisierungsDatumFormatted == null;
    if (isMountSync || (isActive && isUpdateDateMissing)) _loadFooterData.loadFooterUpdateDate(_KDB);
    if (isMountSync || (isActive && state.createdUserName == null)) _loadFooterData.loadFooterCreatedUser(_KDB);
  }

  function runFooterEffects(_KDB, _action, _prevState) {
    // Boundary: a DOM/effects failure is logged so the caller still pushes the history step for the committed state.
    try {
      if (_KDB.state.footer.status !== "active") _view.removeFooterChrome(_KDB);
      else _view.ensureFooterChrome(_KDB);
      _view.syncFooterView(_KDB);
      syncKdbControlReadView(_KDB, _action, _prevState);
      loadMissingFooterData(_KDB, _action);
    } catch (err) {
      console.error("[footer.effects]", err);
    }
  }

  return { runFooterEffects: runFooterEffects };
});
