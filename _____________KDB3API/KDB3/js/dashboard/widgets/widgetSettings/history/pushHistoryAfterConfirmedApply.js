define([
  "./pushWidgetSettingsHistoryStep.js"
], function (_pushHistoryStep) {
  "use strict";

  // B6 (remediation): de history-push voor dropdown-opties wacht op het
  // apply-resultaat; een gefaald of afgebroken apply laat geen entry meer
  // achter. Bewust soepeler dan isVisApplyConfirmed (reviewbevinding 1):
  // design-skips (ok: true + skipped, bijv. de display-only titel-dropdown)
  // zijn een echte user-keuze en blijven history-waardig; alleen aantoonbaar
  // falen (ok !== true, stale, error/timeout/aborted) blokkeert de push.
  // Resultaten zonder ok-veld pushen zoals voorheen direct op intentie.
  function isConfirmedForHistory(result) {
    if (result == null || typeof result !== "object") { return true; }
    if (!("ok" in result)) { return true; }
    if (result.ok !== true) { return false; }
    if (result.stale === true) { return false; }
    if (result.status === "error" || result.status === "timeout" || result.status === "aborted") { return false; }
    return true;
  }

  function pushHistoryAfterConfirmedApply(_KDB, _intentResult, _oldFrame, _newFrame, _when) {
    return Promise.resolve(_intentResult).then(function (result) {
      if (!isConfirmedForHistory(result)) {
        console.warn("[widgetSettings.pushHistoryAfterConfirmedApply] apply not confirmed; history step skipped", result);
        return false;
      }
      if (typeof _when === "function" && _when(result) !== true) {
        return false;
      }
      return _pushHistoryStep(_KDB, _oldFrame, _newFrame, { isHistoryReplay: false });
    }).catch(function (error) {
      console.error("[widgetSettings.pushHistoryAfterConfirmedApply] apply rejected; history step skipped", error);
      return false;
    });
  }

  return pushHistoryAfterConfirmedApply;
});
