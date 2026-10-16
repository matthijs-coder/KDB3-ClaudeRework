define(["./config.js", "./iconKeys.js"], function (_config, _iconKeys) {
  "use strict";
  // header/parameterSetRestoreRequested: maps the v3 head {on, title?, sub?, subOn?, icon?} onto owner actions.
  // Restore is absolute: omitted head, on:0 or status "newDashboard" hides, clears the title and resets the icon.

  function applyRestoreAction(_applyAction, _request, _type, _payloadExtra) {
    _applyAction({
      type: _type,
      payload: Object.assign({ source: "writebackSet" }, _payloadExtra),
      options: { skipHistory: _request.skipHistory === true }
    });
  }

  function applyActiveHead(_applyAction, _request, _head) {
    applyRestoreAction(_applyAction, _request, "header/show", {});
    applyRestoreAction(_applyAction, _request, "header/setTitleText", {
      titleText: typeof _head.title === "string" ? _head.title : ""
    });
    var subtitleText = typeof _head.sub === "string" ? _head.sub : "";
    var isSubtitleVisible = subtitleText.trim() !== "" || _head.subOn === 1;
    applyRestoreAction(_applyAction, _request, "header/setSubtitleChrome", {
      subtitleStatus: isSubtitleVisible ? "active" : "removed",
      subtitleText: subtitleText
    });
  }

  function buildResult(_KDB, _ok, _diagnostics, _isDegraded) {
    var payload = { ok: _ok, status: _KDB.state.header ? _KDB.state.header.status : "idle", diagnostics: _diagnostics };
    if (_ok === true) payload.degraded = _isDegraded === true;
    return Promise.resolve(payload);
  }

  function restoreHeaderParameterSet(_KDB, _applyAction, _action) {
    var request = (_action && _action.payload) || {};
    var codes = _config.ERROR_CODES;
    if (typeof request.runId !== "number") {
      return buildResult(_KDB, false, [
        { code: codes.restoreCancelled, message: "header/parameterSetRestoreRequested requires a numeric runId" }
      ]);
    }
    var rt = _KDB.runtime.header;
    if (typeof rt.parameterSetRunId === "number" && request.runId < rt.parameterSetRunId) {
      return buildResult(_KDB, false, [
        { code: codes.restoreCancelled, message: "stale parameterSet runId " + request.runId + " superseded by " + rt.parameterSetRunId }
      ]);
    }
    rt.parameterSetRunId = request.runId;

    var head = request.status === "newDashboard" ? undefined : request.header;
    var diagnostics = [];
    var isDegraded = false;
    try {
      if (head && head.on === 1) {
        var resolved = _iconKeys.resolveHeaderIconKey(head.icon, _iconKeys.readHeaderIconCatalog(_KDB));
        if (resolved.known === false || !_iconKeys.isSafeIconKey(resolved.iconKey)) {
          diagnostics.push({
            code: codes.restoreIconUnsupported,
            message: "unknown or unsafe head.icon stem; falling back to " + _config.DEFAULT_ICON_KEY
          });
          isDegraded = true;
        }
        applyActiveHead(_applyAction, request, head);
        applyRestoreAction(_applyAction, request, "header/setIcon", { iconKey: resolved.iconKey });
      } else {
        applyRestoreAction(_applyAction, request, "header/hide", {});
        applyRestoreAction(_applyAction, request, "header/setTitleText", { titleText: "" });
        applyRestoreAction(_applyAction, request, "header/setIcon", { iconKey: _config.DEFAULT_ICON_KEY });
      }
    } catch (err) {
      diagnostics.push({ code: codes.restoreFailed, message: "header restore apply threw: " + String(err && err.message ? err.message : err) });
      return buildResult(_KDB, false, diagnostics);
    }
    return buildResult(_KDB, true, diagnostics, isDegraded);
  }

  return { restoreHeaderParameterSet: restoreHeaderParameterSet };
});
