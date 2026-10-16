define([
  "./resolveMessagesHostApi.js",
  "./buildMessagesOutcome.js",
  "./config/messagesErrorCodes.js"
], function (_resolveMessagesHostApi, _buildMessagesOutcome, _messagesErrorCodes) {
  "use strict";

  function isAborted(_options) {
    return !!(_options && _options.signal && _options.signal.aborted === true);
  }

  function isDisposedOrStale(_ctx) {
    var runtime;
    if (!_ctx || typeof _ctx.isDisposed !== "function" || _ctx.isDisposed()) {
      return true;
    }
    runtime = _ctx._KDB && _ctx._KDB.runtime && _ctx._KDB.runtime.cognosHostService;
    if (!runtime) {
      return true;
    }
    return runtime.generation !== _ctx.generation;
  }

  async function __controller(_ctx, _text, _type, _options) {
    var messagesApi;
    var text;
    if (isDisposedOrStale(_ctx)) {
      return _buildMessagesOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildMessagesOutcome.buildAborted("aborted");
    }
    text = String(_text == null ? "" : _text);
    try {
      messagesApi = _resolveMessagesHostApi(_ctx._KDB);
      if (!messagesApi) {
        return _buildMessagesOutcome.buildFailed(_messagesErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof messagesApi.showToast !== "function") {
        return _buildMessagesOutcome.buildFailed(_messagesErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      await Promise.resolve(messagesApi.showToast(text, _type));
      if (isDisposedOrStale(_ctx) || isAborted(_options)) {
        return _buildMessagesOutcome.buildAborted("aborted-after-effect");
      }
      return _buildMessagesOutcome.buildOk();
    } catch (error) {
      if (isDisposedOrStale(_ctx)) {
        return _buildMessagesOutcome.buildDisposed();
      }
      if (isAborted(_options) || (error && error.name === "AbortError")) {
        return _buildMessagesOutcome.buildAborted("aborted");
      }
      console.error("[cognosHost.messages.showToast] failed", error);
      return _buildMessagesOutcome.buildFailed(_messagesErrorCodes.WRITE_FAILED, [
        _buildMessagesOutcome.buildDiagnostic(
          _messagesErrorCodes.WRITE_FAILED,
          error && error.message ? error.message : String(error)
        )
      ]);
    }
  }

  return __controller;
});
