define([], function () {
  "use strict";
  // WP5 zoom-fit hint helper. Call sites in header/footer effects are PARKED
  // (PO 2026-09-07 after Cognos green). NOT dead code. Re-enable by uncommenting
  // `_notifyZoomHint(...)` there. Do not delete this file in a dead-code sweep
  // without notifying PO.

  function readZoomHintLabel(_KDB) {
    var value =
      _KDB.config &&
      _KDB.config.labels &&
      _KDB.config.labels.de &&
      _KDB.config.labels.de.header &&
      _KDB.config.labels.de.header.zoomFitToPageHint;
    if (typeof value !== "string") return "";
    value = value.trim();
    if (!value) return "";
    return value;
  }

  function readConnectedHeaderRoot(_KDB) {
    var el =
      _KDB.runtime &&
      _KDB.runtime.header &&
      _KDB.runtime.header.domRefs &&
      _KDB.runtime.header.domRefs.rootEl;
    if (el && el.isConnected === true) return el;
    return null;
  }

  function shouldSkipAction(_action) {
    if (!_action) return false;
    if (_action.type === "__mountSync") return true;
    if (_action.type === "__unmount") return true;
    if (_action.options && _action.options.isHistoryReplay === true) return true;
    return false;
  }

  function isActiveTransition(_prev, _next) {
    if (!_prev || !_next) return false;
    return _prev.status !== "active" && _next.status === "active";
  }

  function __controller(_KDB, _action, _prev, _next) {
    try {
      if (shouldSkipAction(_action)) return;
      if (!isActiveTransition(_prev, _next)) return;
      var label = readZoomHintLabel(_KDB);
      if (!label) {
        console.warn("[header.notifyZoomHint] missing zoomFitToPageHint label");
        return;
      }
      var svc = _KDB.services && _KDB.services.message;
      if (!svc || typeof svc.notifyAnchored !== "function") {
        console.warn("[header.notifyZoomHint] messageService missing");
        return;
      }
      var rootEl = readConnectedHeaderRoot(_KDB);
      if (!rootEl) return;
      svc.notifyAnchored({
        anchor: rootEl,
        code: "HEADER_FOOTER_ZOOM_HINT",
        message: label,
        severity: "info",
        durationMs: 10000
      });
    } catch (err) {
      console.error("[header.notifyZoomHint]", err);
    }
  }

  return __controller;
});
