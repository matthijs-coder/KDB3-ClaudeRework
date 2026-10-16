define(["../config/headerIconKeys"], function (_iconKeys) {
  "use strict";

  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";
  var UNSUPPORTED = "WRITEBACK_HEADER_FIELD_UNSUPPORTED";
  var RESTORE_FAILED = "WRITEBACK_HEADER_RESTORE_FAILED";

  // header/parameterSetRestoreRequested per
  // contracts/header-parameterSetRestore-contractdelta.md. Maps v3 head
  // {on, title?, sub?, subOn?, icon?} onto existing owner actions. Restore is
  // absolute: omitted head / on:0 / newDashboard hides, clears texts, resets icon.
  function handleParameterSetRestore(_KDB, _deps, _action) {
    var p = (_action && _action.payload) || {};
    var diagnostics = [];
    if (typeof p.runId !== "number") {
      return result(_KDB, false, [{ code: CANCELLED, message: "header/parameterSetRestoreRequested requires a numeric runId" }]);
    }
    var runtime = _KDB.runtime.header;
    if (typeof runtime.parameterSetRunId === "number" && p.runId < runtime.parameterSetRunId) {
      return result(_KDB, false, [{ code: CANCELLED, message: "stale parameterSet runId " + p.runId + " superseded by " + runtime.parameterSetRunId }]);
    }
    runtime.parameterSetRunId = p.runId;

    var head = p.status === "newDashboard" ? undefined : p.header;
    var degraded = false;
    try {
      if (head && head.on === 1) {
        var resolved = _iconKeys.resolveHeaderIconKey(head.icon, _iconKeys.readHeaderIconCatalog(_KDB));
        if (resolved.known === false) {
          diagnostics.push({
            code: UNSUPPORTED,
            message: "unknown head.icon stem; falling back to " + _iconKeys.DEFAULT_ICON_KEY,
          });
          degraded = true;
        }
        applyActive(_deps, p, head);
        applyAction(_deps, p, "header/setIcon", { iconKey: resolved.iconKey });
      } else {
        applyAction(_deps, p, "header/hide", {});
        applyAction(_deps, p, "header/setTitleText", { titleText: "" });
        applyAction(_deps, p, "header/setIcon", { iconKey: _iconKeys.DEFAULT_ICON_KEY });
      }
    } catch (err) {
      diagnostics.push({ code: RESTORE_FAILED, message: "header restore apply threw: " + String(err && err.message ? err.message : err) });
      return result(_KDB, false, diagnostics);
    }
    return result(_KDB, true, diagnostics, degraded);
  }

  function applyActive(_deps, p, head) {
    applyAction(_deps, p, "header/show", {});
    applyAction(_deps, p, "header/setTitleText", { titleText: typeof head.title === "string" ? head.title : "" });
    var subText = typeof head.sub === "string" ? head.sub : "";
    var subVisible = subText.trim() !== "" || head.subOn === 1;
    applyAction(_deps, p, "header/setSubtitleChrome", {
      subtitleStatus: subVisible ? "active" : "removed",
      subtitleText: subText,
    });
  }

  function applyAction(_deps, p, type, payloadExtra) {
    var payload = Object.assign({ source: "writebackSet" }, payloadExtra);
    _deps.applyAction({
      type: type,
      payload: payload,
      options: { skipHistory: p.skipHistory === true },
    });
  }

  function result(_KDB, ok, diagnostics, degraded) {
    var status = _KDB.state.header ? _KDB.state.header.status : "idle";
    var payload = { ok: ok, status: status, diagnostics: diagnostics };
    if (ok === true) payload.degraded = degraded === true;
    return Promise.resolve(payload);
  }

  return handleParameterSetRestore;
});
