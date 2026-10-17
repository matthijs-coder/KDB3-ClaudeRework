define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js"
], function (_outcome, _errorCodes, _hostAccess) {
  "use strict";

  // The messages facet of the cognosHost service: transport for messageService only,
  // showToast(text, type). Layer-1 host is cognosAPI.glassMessages (there is no
  // _KDB.cognosAPI.messages).
  var CODES = _errorCodes.messages;

  async function showToast(_ctx, _text, _type, _options) {
    var resolved;
    if (_hostAccess.isFacetStale(_ctx)) {
      return _outcome.buildDisposed();
    }
    if (_hostAccess.isAborted(_options)) {
      return _outcome.buildAborted("aborted");
    }
    try {
      resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "glassMessages", "showToast", CODES);
      if (resolved.failure) {
        return resolved.failure;
      }
      await Promise.resolve(resolved.api.showToast(String(_text == null ? "" : _text), _type));
      if (_hostAccess.isFacetStale(_ctx) || _hostAccess.isAborted(_options)) {
        return _outcome.buildAborted("aborted-after-effect");
      }
      return _outcome.buildOk();
    } catch (error) {
      if (_hostAccess.isFacetStale(_ctx)) {
        return _outcome.buildDisposed();
      }
      if (_hostAccess.isAborted(_options) || (error && error.name === "AbortError")) {
        return _outcome.buildAborted("aborted");
      }
      console.error("[cognosHost.messages.showToast] failed", error);
      return _outcome.buildFailed(CODES.WRITE_FAILED, [
        _outcome.buildDiagnostic(CODES.WRITE_FAILED, error && error.message ? error.message : String(error))
      ]);
    }
  }

  function createMessagesAdapter(_ctx) {
    return { showToast: showToast.bind(null, _ctx) };
  }

  return createMessagesAdapter;
});
