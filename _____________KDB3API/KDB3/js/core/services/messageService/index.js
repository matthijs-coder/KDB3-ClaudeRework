define([
  "../../utils/kit/errors.js",
  "./config.js",
  "./copyable.js",
  "./modalQueue.js",
  "./notifications.js",
  "./runtime.js"
], function (_errors, _config, _copyable, _createModalQueue, _notifications, _runtime) {
  "use strict";

  function logPublicError(methodName, error) {
    console.error("[messageService." + methodName + "] public method failed", error);
  }

  function createMessageService(_KDB, labels) {
    var guard = _errors.createDisposedGuard("messageService");
    var modalQueue;
    var publicApi;

    function rejectDisposed(methodName) {
      return Promise.reject(new Error("messageService." + methodName + " called after destroy"));
    }

    function withCloseLabel(options) {
      var copy = Object.assign({}, options || {});
      copy.closeLabel = copy.closeLabel || labels.close;
      return copy;
    }

    function notify(options) {
      var pending;
      if (guard.blocked("notify")) return;
      try {
        pending = _notifications.presentNotify(_KDB, withCloseLabel(options));
        if (pending && typeof pending.catch === "function") {
          pending.catch(function (error) { logPublicError("notify", error); });
        }
      } catch (error) {
        logPublicError("notify", error);
      }
    }

    function notifyAnchored(options) {
      if (guard.blocked("notifyAnchored")) return;
      try {
        _notifications.renderAnchoredNotification(_KDB, withCloseLabel(options), notify);
      } catch (error) {
        logPublicError("notifyAnchored", error);
        notify(options);
      }
    }

    function showAlert(options) {
      if (guard.blocked("showAlert")) return;
      try {
        modalQueue.enqueuePassive("alert", options || {});
      } catch (error) {
        logPublicError("showAlert", error);
      }
    }

    function showCopyable(options) {
      if (guard.blocked("showCopyable")) return undefined;
      try {
        return _copyable.showCopyable(modalQueue, options);
      } catch (error) {
        logPublicError("showCopyable", error);
        return undefined;
      }
    }

    function confirm(options) {
      if (guard.blocked("confirm")) return rejectDisposed("confirm");
      try {
        return modalQueue.enqueueInteractive("confirm", options || {});
      } catch (error) {
        logPublicError("confirm", error);
        return Promise.resolve({ confirmed: false, reason: "unavailable" });
      }
    }

    function choose(options) {
      if (guard.blocked("choose")) return rejectDisposed("choose");
      if (!options || !Array.isArray(options.choices) || options.choices.length === 0) {
        return Promise.reject(new Error("messageService.choose requires non-empty choices"));
      }
      try {
        return modalQueue.enqueueInteractive("choose", options);
      } catch (error) {
        logPublicError("choose", error);
        return Promise.resolve({ choice: null, reason: "unavailable" });
      }
    }

    function destroy() {
      if (guard.isDisposed()) return;
      guard.dispose();
      try {
        modalQueue.destroy();
        _runtime.clearMessageRuntime(_KDB);
      } catch (error) {
        logPublicError("destroy", error);
      } finally {
        if (_KDB.services && _KDB.services.message === publicApi) {
          _KDB.services.message = null;
        }
      }
    }

    _runtime.ensureMessageRuntime(_KDB);
    modalQueue = _createModalQueue(_KDB, labels, notify);
    publicApi = {
      choose: choose,
      confirm: confirm,
      destroy: destroy,
      notify: notify,
      notifyAnchored: notifyAnchored,
      showAlert: showAlert,
      showCopyable: showCopyable
    };
    return publicApi;
  }

  function registerLabels(_KDB) {
    _KDB.config.labels.de.message = Object.assign({}, _config.messageLabels, _KDB.config.labels.de.message || {});
    return _KDB.config.labels.de.message;
  }

  function readMessagesFacet(_KDB) {
    var host = _KDB.services ? _KDB.services.cognosHost : null;
    return host && host.messages ? host.messages : null;
  }

  function registerMessageService(_KDB) {
    var labels;
    _runtime.ensureMessageRuntime(_KDB).messagesFacet = readMessagesFacet(_KDB);
    if (_KDB.services.message) return _KDB.services.message;
    labels = registerLabels(_KDB);
    _KDB.services.message = createMessageService(_KDB, labels);
    return _KDB.services.message;
  }

  return registerMessageService;
});
