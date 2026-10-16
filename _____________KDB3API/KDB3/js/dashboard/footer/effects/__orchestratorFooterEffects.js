define([
  "../view/syncFooterFromState",
  "../view/buildFooterChrome",
  "../view/placeFooter",
  "./loadFooterUpdateDate.js",
  "./loadFooterCreatedUser.js",
  "../../header/effects/notifyZoomHint.js" // WP5: kept while trigger parked — NOT unused; see TRIGGER PARKED at the call site in this file
], function (_syncFooterFromState, _buildFooterChrome, _placeFooter, _loadFooterUpdateDate, _loadFooterCreatedUser, _notifyZoomHint) {
  "use strict";
  function ensureFooterMounted(_KDB) {
    var rt = _KDB.runtime.footer;
    var dr = rt.domRefs;
    var st = _KDB.state.footer;
    if (st.status !== "active") return;
    if (dr.rootEl) {
      if (!dr.rootEl.parentNode) _placeFooter(rt.domRefs && rt.domRefs.mountTargetEl, dr.rootEl);
      return;
    }
    var built = _buildFooterChrome();
    dr.rootEl = built.root;
    dr.barEl = built.barEl;
    dr.dashboardTitleEl = built.dashboardTitleEl;
    dr.dataAktEl = built.dataAktEl;
    dr.centerDateUserEl = built.centerDateUserEl;
    dr.pageIndicatorEl = built.pageIndicatorEl;
    _placeFooter(rt.domRefs && rt.domRefs.mountTargetEl, dr.rootEl);
  }
  function teardownFooter(_KDB) {
    var dr = _KDB.runtime.footer.domRefs;
    if (dr.rootEl && dr.rootEl.parentNode) dr.rootEl.parentNode.removeChild(dr.rootEl);
    dr.rootEl = null;
    dr.barEl = null;
    dr.dashboardTitleEl = null;
    dr.dataAktEl = null;
    dr.centerDateUserEl = null;
    dr.pageIndicatorEl = null;
  }
  function syncKdbControlReadView(_KDB, action, prevState) {
    var st = _KDB.state.footer;
    var replay = action && action.options && action.options.isHistoryReplay === true;
    var statusChanged = !!(prevState && prevState.status !== st.status);
    if (!replay && !statusChanged) return;
    var rt = _KDB.runtime && _KDB.runtime.kdbControl;
    var ctx = rt && rt.frameworkBindContext;
    if (ctx && typeof ctx.syncView === "function") ctx.syncView();
  }
  function __effects(_KDB, action, prevState) {
    try {
      if (action && action.type === "__unmount") {
        _loadFooterUpdateDate.abortFooterUpdateDate(_KDB);
        return;
      }
      var st = _KDB.state.footer;
      if (st.status !== "active") teardownFooter(_KDB);
      else ensureFooterMounted(_KDB);
      _syncFooterFromState(_KDB);
      // WP5 zoom-fit hint — TRIGGER PARKED (PO 2026-09-07, after Cognos green).
      // NOT dead code. When enabled, a Fußzeile chrome idle|removed → active
      // (header already active) would call the header-owned helper
      // notifyZoomHint.js → messageService.notifyAnchored (same code/anchor as
      // header so the toast collapses instead of doubling). AMD import of
      // _notifyZoomHint is kept on purpose. Re-enable: uncomment the call.
      // Do not delete this block, the import, or the header helper/labels in a
      // commented-code / unused-import sweep without notifying PO.
      // _notifyZoomHint(_KDB, action, prevState, st);
      syncKdbControlReadView(_KDB, action, prevState);
      if (action && action.type === "__mountSync") {
        _loadFooterUpdateDate.loadFooterUpdateDate(_KDB);
        _loadFooterCreatedUser.loadFooterCreatedUser(_KDB);
      }
      if (st.status === "active" && st.aktualisierungsDatumRaw == null && st.aktualisierungsDatumFormatted == null) {
        _loadFooterUpdateDate.loadFooterUpdateDate(_KDB);
      }
      if (st.status === "active" && st.createdUserName == null) {
        _loadFooterCreatedUser.loadFooterCreatedUser(_KDB);
      }
    } catch (err) {
      console.error("[footer.effects]", err);
    }
  }
  return __effects;
});
