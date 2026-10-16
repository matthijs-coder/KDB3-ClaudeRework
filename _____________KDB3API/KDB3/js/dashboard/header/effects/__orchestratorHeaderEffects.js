define([
  "../view/syncHeaderFromState",
  "../view/buildHeaderChrome",
  "../view/placeHeader",
  "../events/eventNames",
  "../../footer/view/syncFooterFromState",
  "./bindHeaderEditSession",
  "./syncHeaderKdbControlReadView",
  "./notifyZoomHint" // WP5: kept while trigger parked — NOT unused; see TRIGGER PARKED at the call site in this file
], function (
  _syncHeaderFromState,
  _buildHeaderChrome,
  _placeHeader,
  _eventNames,
  _syncFooterFromState,
  _bindHeaderEditSession,
  _syncHeaderKdbControlReadView,
  _notifyZoomHint
) {
  "use strict";
  function snapshotChrome(st) {
    return {
      status: st.status,
      subtitleStatus: st.subtitleStatus,
      titleText: st.titleText,
      subtitleText: st.subtitleText,
    };
  }
  function sameChrome(a, b) {
    return (
      a.status === b.status &&
      a.subtitleStatus === b.subtitleStatus &&
      a.titleText === b.titleText &&
      a.subtitleText === b.subtitleText
    );
  }
  function noEmitTypes(t) {
    return t === "header/startTitleEdit" || t === "header/startSubtitleEdit";
  }
  function ensureChromeMounted(_KDB) {
    var rt = _KDB.runtime.header;
    var dr = rt.domRefs;
    var st = _KDB.state.header;
    if (st.status !== "active") return;
    if (dr.rootEl) return;
    var built = _buildHeaderChrome(_KDB);
    dr.rootEl = built.root;
    dr.titleEl = built.titleEl;
    dr.subtitleEl = built.subtitleEl;
    dr.draftTitleEl = built.draftTitleEl;
    dr.draftSubtitleEl = built.draftSubtitleEl;
    dr.iconEl = built.iconEl;
    _placeHeader(rt.domRefs && rt.domRefs.mountTargetEl, dr.rootEl);
  }
  function teardownChrome(_KDB) {
    var dr = _KDB.runtime.header.domRefs;
    if (dr.rootEl && dr.rootEl.parentNode) dr.rootEl.parentNode.removeChild(dr.rootEl);
    dr.rootEl = null;
    dr.titleEl = null;
    dr.subtitleEl = null;
    dr.draftTitleEl = null;
    dr.draftSubtitleEl = null;
    dr.iconEl = null;
  }
  function __effects(_KDB, prevChrome, action) {
    try {
      var st = _KDB.state.header;
      if (st.status !== "active") teardownChrome(_KDB);
      else ensureChromeMounted(_KDB);
      _syncHeaderFromState(_KDB);
      _bindHeaderEditSession(_KDB, action);
      if (_KDB.state.footer && _KDB.state.footer.status === "active") {
        _syncFooterFromState(_KDB);
      }
      _syncHeaderKdbControlReadView(_KDB, action);
      var t = action && action.type;
      if (t === "__mountSync") return;
      // WP5 zoom-fit hint — TRIGGER PARKED (PO 2026-09-07, after Cognos green).
      // NOT dead code. When enabled, a Kopfzeile chrome idle|removed → active
      // would call header/effects/notifyZoomHint.js → messageService.notifyAnchored
      // (code HEADER_FOOTER_ZOOM_HINT, An Seite anpassen copy). AMD import of
      // _notifyZoomHint is kept on purpose. Re-enable: uncomment the call.
      // Do not delete this block, the import, notifyZoomHint.js, or headerLabels.js
      // in a commented-code / unused-import sweep without notifying PO.
      // _notifyZoomHint(_KDB, action, prevChrome, st);
      var now = snapshotChrome(st);
      var src = (action.payload && action.payload.source) || "bootstrap";
      if (!noEmitTypes(t) && !sameChrome(prevChrome, now) && _KDB.events && typeof _KDB.events.emit === "function") {
        _KDB.events.emit(_eventNames.HEADER_CONFIRMED_CHANGED, {
          status: now.status,
          subtitleStatus: now.subtitleStatus,
          titleText: now.titleText,
          subtitleText: now.subtitleText,
          source: src,
        });
      }
    } catch (err) {
      console.error("[header.effects]", err);
    }
  }
  return __effects;
});
