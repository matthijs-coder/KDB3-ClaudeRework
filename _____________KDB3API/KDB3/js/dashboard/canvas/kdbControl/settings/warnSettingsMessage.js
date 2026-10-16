define([], function () {
  "use strict";
  function resolveAnchor(fieldId) {
    return fieldId && typeof document !== "undefined" ? document.getElementById(fieldId) : null;
  }
  function resolveSeverity(_payload) { return _payload && (_payload.severity === "info" || _payload.severity === "success" || _payload.severity === "warning" || _payload.severity === "error") ? _payload.severity : "warning"; }
  function warnSettingsMessage(_KDB, payload) {
    var p = payload || {};
    var svc = _KDB && _KDB.services && _KDB.services.message;
    var anchor = resolveAnchor(p.fieldId);
    if (svc && typeof svc.notify === "function") {
      try {
        if (anchor && typeof svc.notifyAnchored === "function") {
          svc.notifyAnchored({ anchor: anchor, code: p.code, message: p.message, severity: resolveSeverity(p) });
        } else {
          svc.notify({ code: p.code, message: p.message, severity: resolveSeverity(p) });
        }
      } catch (err) {
        console.warn("[kdbControl] services.message notification failed", err);
      }
      return;
    }
    console.warn(
      "[kdbControl]",
      p.code || "settingsMessage",
      p.message != null ? p.message : "",
      p.fieldId != null ? "(" + p.fieldId + ")" : ""
    );
  }
  return { warnSettingsMessage: warnSettingsMessage };
});
