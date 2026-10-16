define([], function () {
  "use strict";

  function blockedResult(_status, _errorCode, _blockedReason, _input, _extra) {
    var isStartup = (_input.payload && _input.payload.source === "startup") || _input.reason === "startup";
    var out = {
      ok: false,
      widgetId: _input.widgetId,
      opSeq: _input.opSeq,
      status: _status,
      errorCode: _errorCode,
      errorMessage: _blockedReason === "awaiting_dienststelle"
        ? "Binding blocked until confirmed Dienststelle hierarchy is available."
        : _blockedReason === "awaiting_topN"
          ? "Binding blocked until TopN helper result is available."
          : _blockedReason === "missing_topN_helper_list_config"
            ? "TopN helper List visualization config is missing for the current metric/table."
            : "Binding prerequisites are incomplete.",
      diagnostics: Object.assign({ blockedReason: _blockedReason }, _extra || {})
    };
    if (_blockedReason === "awaiting_topN" && _extra && _extra.topNUnavailable === true && isStartup) {
      out.ok = true;
      out.status = "deferred";
      out.skipped = true;
      out.errorCode = null;
    }
    if (_blockedReason === "prerequisite_failed" && _extra && _extra.errorMessage) {
      out.errorMessage = _extra.errorMessage;
    }
    return out;
  }

  return blockedResult;
});
