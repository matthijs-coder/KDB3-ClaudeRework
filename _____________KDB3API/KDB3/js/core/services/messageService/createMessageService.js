define([
  "./effects/createModalQueue.js",
  "./effects/presentNotify.js",
  "./effects/showCopyable.js",
  "./runtime/clearMessageRuntime.js",
  "./runtime/ensureMessageRuntime.js",
  "./view/renderAnchoredNotification.js"
], function (_createModalQueue, _presentNotify, _showCopyable, _clearMessageRuntime, _ensureMessageRuntime, _renderAnchoredNotification) {
  "use strict";

  function logPublicError(methodName, error) {
    console.error("[messageService." + methodName + "] public method failed", error);
  }

  function warnDisposed(context, methodName) {
    if (!context.warned[methodName]) {
      console.warn("[messageService." + methodName + "] called after destroy");
      context.warned[methodName] = true;
    }
  }

  function isDisposed(context, methodName) {
    if (!context._isDisposed) return false;
    warnDisposed(context, methodName);
    return true;
  }

  function rejectDisposed(context, methodName) {
    warnDisposed(context, methodName);
    return Promise.reject(new Error("messageService." + methodName + " called after destroy"));
  }

  function notify(context, _options) {
    var options;
    if (isDisposed(context, "notify")) return;
    try {
      options = Object.assign({}, _options || {});
      options.closeLabel = options.closeLabel || context.labels.close;
      _presentNotify(context._KDB, options);
    } catch (error) {
      logPublicError("notify", error);
    }
  }

  function notifyAnchored(context, _options) {
    var options;
    if (isDisposed(context, "notifyAnchored")) return;
    try {
      options = Object.assign({}, _options || {});
      options.closeLabel = options.closeLabel || context.labels.close;
      _renderAnchoredNotification(context._KDB, options, notify.bind(null, context));
    } catch (error) {
      logPublicError("notifyAnchored", error);
      notify(context, _options);
    }
  }

  function showAlert(context, _options) {
    if (isDisposed(context, "showAlert")) return;
    try {
      context.modalQueue.enqueuePassive("alert", _options || {});
    } catch (error) {
      logPublicError("showAlert", error);
    }
  }

  function showCopyable(context, _options) {
    if (isDisposed(context, "showCopyable")) return;
    try {
      return _showCopyable(context, _options);
    } catch (error) {
      logPublicError("showCopyable", error);
    }
  }

  function confirm(context, _options) {
    if (context._isDisposed) return rejectDisposed(context, "confirm");
    try {
      return context.modalQueue.enqueueInteractive("confirm", _options || {});
    } catch (error) {
      logPublicError("confirm", error);
      return Promise.resolve({ confirmed: false, reason: "unavailable" });
    }
  }

  function choose(context, _options) {
    if (context._isDisposed) return rejectDisposed(context, "choose");
    if (!_options || !Array.isArray(_options.choices) || _options.choices.length === 0) {
      return Promise.reject(new Error("messageService.choose requires non-empty choices"));
    }
    try {
      return context.modalQueue.enqueueInteractive("choose", _options || {});
    } catch (error) {
      logPublicError("choose", error);
      return Promise.resolve({ choice: null, reason: "unavailable" });
    }
  }

  function destroy(context) {
    if (context._isDisposed) return;
    context._isDisposed = true;
    try {
      context.modalQueue.destroy();
      _clearMessageRuntime(context._KDB);
    } catch (error) {
      logPublicError("destroy", error);
    } finally {
      if (context._KDB.services && context._KDB.services.message === context.publicApi) {
        context._KDB.services.message = null;
      }
    }
  }

  function createPublicApi(context) {
    return {
      choose: choose.bind(null, context),
      confirm: confirm.bind(null, context),
      destroy: destroy.bind(null, context),
      notify: notify.bind(null, context),
      notifyAnchored: notifyAnchored.bind(null, context),
      showAlert: showAlert.bind(null, context),
      showCopyable: showCopyable.bind(null, context)
    };
  }

  function createMessageService(_KDB, _options) {
    var context = {
      _KDB: _KDB,
      _isDisposed: false,
      labels: (_options && _options.labels) || {},
      modalQueue: null,
      publicApi: null,
      warned: {}
    };
    _ensureMessageRuntime(_KDB);
    context.modalQueue = _createModalQueue(_KDB, context.labels, notify.bind(null, context));
    context.publicApi = createPublicApi(context);
    return context.publicApi;
  }

  return createMessageService;
});
