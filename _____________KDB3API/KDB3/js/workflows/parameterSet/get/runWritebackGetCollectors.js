define([
  "../schema/errorCodes.js",
  "./collectors/collectCanvasSettings.js",
  "./collectors/collectHeaderFooter.js",
  "./collectors/collectTabs.js",
  "./collectors/collectFilters.js",
  "./collectors/collectWidgets.js",
], function (
  _errorCodes,
  _collectCanvasSettings,
  _collectHeaderFooter,
  _collectTabs,
  _collectFilters,
  _collectWidgets
) {
  "use strict";

  // User-facing alert texts (German; labels are owned by the set service, localisation is Phase 2).
  const ALERT_TITLE = "Dashboard speichern";
  const SAVE_FAILED_TEXT = "Das Dashboard konnte nicht gespeichert werden; der zuletzt gespeicherte Stand bleibt erhalten. ";
  const SAVE_FAILED_SUFFIX = " Details stehen in der Browser-Konsole.";
  const FAILED_AREAS_PREFIX = "Fehlgeschlagene Bereiche: ";
  const PARTIAL_COLLECT_TEXT = "Beim Speichern konnten nicht alle Bereiche erfasst werden, weil Teile des Dashboards noch nicht bereit waren "
    + "(z. B. Filter oder noch nicht geladene Tabs). Zuletzt getroffene Auswahlen fehlen möglicherweise im "
    + "gespeicherten Stand. Bitte kurz warten und erneut speichern. Details stehen in der Browser-Konsole.";

  async function runWritebackGetCollectors(_KDB, _rawFrame, _diagnostics) {
    await runCollector(_KDB, "canvasSettings", _collectCanvasSettings, _rawFrame, _diagnostics);
    await runCollector(_KDB, "headerFooter", _collectHeaderFooter, _rawFrame, _diagnostics);
    await runCollector(_KDB, "tabs", _collectTabs, _rawFrame, _diagnostics);
    await runCollector(_KDB, "filters", _collectFilters, _rawFrame, _diagnostics);
    await runCollector(_KDB, "widgets", _collectWidgets, _rawFrame, _diagnostics);
    assertCollectorsSucceeded(_KDB, _diagnostics);
    notifyPartialCollect(_KDB, _diagnostics);
  }

  async function runCollector(_KDB, name, collector, rawFrame, diagnostics) {
    try {
      const fragment = await collector(_KDB, diagnostics);
      if (!fragment || typeof fragment !== "object") { return; }
      const keys = Object.keys(fragment);
      for (let index = 0; index < keys.length; index += 1) {
        rawFrame[keys[index]] = fragment[keys[index]];
      }
    } catch (error) {
      if (error && error.diagnostic) {
        diagnostics.push(error.diagnostic);
      }
      diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_COLLECTOR_FAILED,
        "get",
        "collector \"" + name + "\" failed; save is aborted instead of persisting a partial payload",
        { collector: name, error: error && error.message ? error.message : String(error) }
      ));
    }
  }

  function assertCollectorsSucceeded(_KDB, diagnostics) {
    const failures = [];
    for (let index = 0; index < diagnostics.length; index += 1) {
      const diagnostic = diagnostics[index];
      if (diagnostic && diagnostic.code === _errorCodes.codes.WRITEBACK_COLLECTOR_FAILED) {
        failures.push(diagnostic);
      }
    }
    if (failures.length === 0) { return; }
    console.warn("[writebackGet.collect] diagnostics", diagnostics);
    const failedNames = [];
    for (let index = 0; index < failures.length; index += 1) {
      const details = failures[index].details;
      failedNames.push(details && details.collector ? details.collector : "?");
    }
    notifySaveFailed(_KDB, FAILED_AREAS_PREFIX + failedNames.join(", ") + ".");
    throw _errorCodes.createWritebackError(
      _errorCodes.codes.WRITEBACK_COLLECTOR_FAILED,
      "get",
      "one or more collectors failed; save aborted instead of persisting a partial payload",
      { failures: failures }
    );
  }

  function notifyPartialCollect(_KDB, diagnostics) {
    const partialCodes = [
      _errorCodes.codes.WRITEBACK_SINGLESELECT_INVENTORY_STALE,
      _errorCodes.codes.WRITEBACK_TABS_NOT_READY
    ];
    let hasPartial = false;
    for (let index = 0; index < diagnostics.length; index += 1) {
      const diagnostic = diagnostics[index];
      if (diagnostic && partialCodes.indexOf(diagnostic.code) !== -1) {
        hasPartial = true;
        break;
      }
    }
    if (!hasPartial) { return; }
    notifySaveIssue(_KDB, "warning", PARTIAL_COLLECT_TEXT);
  }

  function notifySaveFailed(_KDB, detailText) {
    notifySaveIssue(_KDB, "error", SAVE_FAILED_TEXT + (detailText || "") + SAVE_FAILED_SUFFIX);
  }

  function notifySaveIssue(_KDB, severity, messageText) {
    const messageService = _KDB.services && _KDB.services.message;
    if (!messageService || typeof messageService.showAlert !== "function") { return; }
    try {
      messageService.showAlert({ title: ALERT_TITLE, severity: severity, message: messageText });
    } catch (messageError) {
      console.warn("[writebackGet.collect] user message failed", messageError);
    }
  }

  return {
    runWritebackGetCollectors: runWritebackGetCollectors,
    notifySaveFailed: notifySaveFailed
  };
});
