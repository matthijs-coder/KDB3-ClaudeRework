define(["../state/ensureWritebackRuntime.js"], function (_ensureWritebackRuntime) {
  "use strict";

  function pickDienststelleInfoKey(_hint) {
    var fallbackScopes;
    var missingValues;
    if (!_hint) {
      return null;
    }
    fallbackScopes = Array.isArray(_hint.fallbackScopes) ? _hint.fallbackScopes : [];
    missingValues = Array.isArray(_hint.missingValues) ? _hint.missingValues : [];
    if (fallbackScopes.length > 0) {
      return "dienststelleRestoreFallbackMessage";
    }
    if (missingValues.length > 0) {
      return "dienststelleRestoreMissingMessage";
    }
    return null;
  }

  function includesLabel(_list, _label) {
    return Array.isArray(_list) && _list.indexOf(_label) !== -1;
  }

  function collectSssInfoKeys(_hint) {
    var keys = [];
    var cleared;
    var applied;
    if (!_hint) {
      return keys;
    }
    cleared = Array.isArray(_hint.clearedRestoredValues) ? _hint.clearedRestoredValues : [];
    applied = Array.isArray(_hint.appliedDefaultLabels) ? _hint.appliedDefaultLabels : [];
    if (includesLabel(cleared, "Personengruppe")) {
      keys.push("specialSingleSelectRestoreClearedMessage");
    }
    if (includesLabel(applied, "Personengruppe")) {
      keys.push("specialSingleSelectRestoreDefaultPersonengruppeMessage");
    }
    if (includesLabel(cleared, "Dienststellenleitung")) {
      keys.push("specialSingleSelectRestoreClearedDienststellenleitungMessage");
    }
    if (includesLabel(applied, "Dienststellenleitung")) {
      keys.push("specialSingleSelectRestoreDefaultDienststellenleitungMessage");
    }
    return keys;
  }

  function notifyInfoKeys(_KDB, _labelKeys, _warnSss) {
    var labels = _KDB && _KDB.config && _KDB.config.labels && _KDB.config.labels.de
      ? _KDB.config.labels.de.writeback
      : null;
    var messageService = _KDB.services && _KDB.services.message;
    var idx;
    var labelKey;
    var message;
    for (idx = 0; idx < _labelKeys.length; idx += 1) {
      labelKey = _labelKeys[idx];
      message = labels && labelKey ? labels[labelKey] : null;
      if (!message || !messageService || typeof messageService.notify !== "function") {
        if (_warnSss) {
          console.warn("[writebackSet.notifyRestoreOutcome] specialSingleSelect restore info skipped");
        }
        continue;
      }
      messageService.notify({ message: message, severity: "info" });
    }
  }

  function pendRestoreInfo(_runtime, _labelKeys) {
    _runtime.pendingRestoreInfo = {
      labelKeys: _labelKeys.slice(),
      labelKey: _labelKeys[0] || null
    };
  }

  function notifyRestoreOutcome(_KDB, _run, _outcome) {
    var runtime;
    var messageService;
    var dstlKey;
    var sssKeys;
    try {
      runtime = _ensureWritebackRuntime(_KDB);
      if (_outcome === "failed" || _outcome === "abortedByOwner") {
        if (runtime && runtime.urlShareBootOverlayActive === true) {
          if (runtime.pendingUrlShareMessage != null) {
            return undefined;
          }
          runtime.pendingRestoreFailure = true;
          return undefined;
        }
        messageService = _KDB.services && _KDB.services.message;
        if (!messageService || typeof messageService.showAlert !== "function") {
          return undefined;
        }
        messageService.showAlert({
          title: "Dashboard wiederherstellen",
          severity: "error",
          message: "Der gespeicherte Dashboard-Stand konnte nicht vollständig wiederhergestellt werden. "
            + "Bitte das Dashboard neu öffnen und vor dem Speichern den angezeigten Stand prüfen. "
            + "Details stehen in der Browser-Konsole (Run " + (_run && _run.runId) + ")."
        });
        return undefined;
      }
      if (_outcome !== "committed" && _outcome !== "degraded") {
        return undefined;
      }
      dstlKey = pickDienststelleInfoKey(_run && _run.dienststelleRestoreHint);
      if (dstlKey) {
        if (runtime && runtime.urlShareBootOverlayActive === true) {
          pendRestoreInfo(runtime, [dstlKey]);
          return undefined;
        }
        notifyInfoKeys(_KDB, [dstlKey], false);
        return undefined;
      }
      sssKeys = collectSssInfoKeys(_run && _run.specialSingleSelectRestoreHint);
      if (!sssKeys.length) {
        return undefined;
      }
      if (runtime && runtime.urlShareBootOverlayActive === true) {
        pendRestoreInfo(runtime, sssKeys);
        return undefined;
      }
      notifyInfoKeys(_KDB, sssKeys, true);
      return undefined;
    } catch (err) {
      console.error("[writebackSet.notifyRestoreOutcome] failed", err);
      return undefined;
    }
  }

  return notifyRestoreOutcome;
});
