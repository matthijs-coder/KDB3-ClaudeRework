define(["../set/state/ensureWritebackRuntime.js"], function (_ensureWritebackRuntime) {
  "use strict";

  function readWritebackLabels(_KDB) {
    var labels = _KDB && _KDB.config && _KDB.config.labels && _KDB.config.labels.de
      ? _KDB.config.labels.de.writeback
      : null;
    return labels && typeof labels === "object" ? labels : {};
  }

  function formatPendingMessage(_template, _parameterId) {
    return String(_template || "").split("{id}").join(String(_parameterId));
  }

  function readPendingAlertCopy(_pending, _labels) {
    if (_pending && _pending.copy === "hostListUnready") {
      return { title: _labels.hostListUnreadyTitle, message: _labels.hostListUnreadyMessage };
    }
    return { title: _labels.missingIdTitle, message: _labels.missingIdMessage };
  }

  function showAlertGuarded(_messageService, _payload) {
    if (!_messageService || typeof _messageService.showAlert !== "function") {
      console.warn("[writebackSet.presentPendingUrlShareMessage] messageService missing");
      return;
    }
    _messageService.showAlert(_payload);
  }

  function notifyPendingRestoreInfo(_messageService, _labels, _pending) {
    var keys;
    var idx;
    var labelKey;
    var message;
    if (!_pending) {
      return;
    }
    keys = Array.isArray(_pending.labelKeys) && _pending.labelKeys.length
      ? _pending.labelKeys.slice()
      : (_pending.labelKey ? [_pending.labelKey] : []);
    for (idx = 0; idx < keys.length; idx += 1) {
      labelKey = keys[idx];
      message = labelKey && _labels ? _labels[labelKey] : null;
      if (!message || !_messageService || typeof _messageService.notify !== "function") {
        console.warn("[writebackSet.presentPendingUrlShareMessage] restore info skipped");
        continue;
      }
      _messageService.notify({ message: message, severity: "info" });
    }
  }

  function clearOverlayPending(_runtime) {
    _runtime.pendingUrlShareMessage = null;
    _runtime.pendingRestoreFailure = false;
    _runtime.pendingRestoreInfo = null;
  }

  function presentPendingUrlShareMessage(_KDB) {
    var runtime;
    var pending;
    var messageService;
    var labels;
    var alertCopy;
    try {
      runtime = _ensureWritebackRuntime(_KDB);
      pending = runtime.pendingUrlShareMessage;
      if (pending == null && runtime.pendingRestoreFailure !== true
          && runtime.pendingRestoreInfo == null) {
        return undefined;
      }
      messageService = _KDB.services && _KDB.services.message;
      labels = readWritebackLabels(_KDB);
      if (pending != null) {
        alertCopy = readPendingAlertCopy(pending, labels);
        showAlertGuarded(messageService, {
          title: alertCopy.title,
          severity: "warning",
          message: formatPendingMessage(alertCopy.message, pending.parameterId)
        });
        clearOverlayPending(runtime);
        return undefined;
      }
      if (runtime.pendingRestoreFailure === true) {
        showAlertGuarded(messageService, {
          title: "Dashboard wiederherstellen",
          severity: "error",
          message: "Der gespeicherte Dashboard-Stand konnte nicht vollständig wiederhergestellt werden. "
            + "Bitte das Dashboard neu öffnen und vor dem Speichern den angezeigten Stand prüfen. "
            + "Details stehen in der Browser-Konsole."
        });
        clearOverlayPending(runtime);
        return undefined;
      }
      notifyPendingRestoreInfo(messageService, labels, runtime.pendingRestoreInfo);
      runtime.pendingRestoreInfo = null;
      return undefined;
    } catch (error) {
      console.warn("[writebackSet.presentPendingUrlShareMessage] failed", error);
      if (runtime) {
        clearOverlayPending(runtime);
      }
      return undefined;
    }
  }

  return presentPendingUrlShareMessage;
});
