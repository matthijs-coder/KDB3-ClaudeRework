define([
  "../config/defaults.js",
  "../config/mutationCodes.js"
], function (_defaults, _codes) {
  "use strict";

  async function confirmAndDispatchTabDelete(_KDB, _request) {
    try {
      var request = _request || {};
      var svc = _KDB.services && _KDB.services.message;
      if (_KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.pendingPromises && _KDB.runtime.tabs.pendingPromises.tabMutation) {
        if (svc && typeof svc.notify === "function") {
          svc.notify({ code: _codes.CONFLICT, severity: "warning", message: _defaults.TAB_DELETE_CONFLICT_TEXT });
        }
        return { ok: false, diagnostics: [{ code: _codes.CONFLICT }] };
      }
      if (!svc || typeof svc.confirm !== "function") {
        console.warn("[tabs.editIcon] messageService unavailable — delete blocked (fail closed)");
        return { ok: false, blocked: true };
      }
      var result = await svc.confirm({
        code: "TABS_DELETE_CONFIRM",
        title: _defaults.TAB_DELETE_CONFIRM_TITLE,
        message: _defaults.TAB_DELETE_CONFIRM_TEXT
      });
      if (!result || result.confirmed !== true) { return { ok: false, cancelled: true }; }
      var mutationResult = await _KDB.api.tabs.dispatch({
        type: "tabs/delete",
        payload: { tabIndex: request.tabIndex, tabId: request.tabId, source: "tabsEditUi" }
      });
      if (!mutationResult || mutationResult.ok === true) { return mutationResult || { ok: true }; }
      console.warn("[tabs.editIcon] delete mutation failed", mutationResult);
      surfaceFailure(svc, mutationResult);
      return mutationResult;
    } catch (err) {
      var svc = _KDB.services && _KDB.services.message;
      if (svc && typeof svc.showAlert === "function") {
        svc.showAlert({
          code: "TABS_MUTATION_APPLY_FAILED",
          severity: "error",
          title: _defaults.TAB_DELETE_FAILED_TITLE,
          message: String(err && err.message ? err.message : err)
        });
      }
      return { ok: false, diagnostics: [{ code: _codes.APPLY_FAILED, message: String(err && err.message ? err.message : err) }] };
    }
  }

  function surfaceFailure(svc, mutationResult) {
    if (mutationResult.outcome === "degraded" && svc.notify) {
      svc.notify({
        code: readPrimaryCode(mutationResult) || _codes.HOST_RESYNC_FAILED,
        severity: "info",
        message: _defaults.TAB_MUTATION_DEGRADED_TEXT
      });
      return;
    }
    var firstCode = readPrimaryCode(mutationResult);
    if (firstCode === _codes.MIN_VISIBLE && svc.notify) {
      svc.notify({ code: firstCode, severity: "warning", message: _defaults.TAB_DELETE_MIN_VISIBLE_TEXT });
      return;
    }
    if (firstCode === _codes.CONFLICT && svc.notify) {
      svc.notify({ code: firstCode, severity: "warning", message: _defaults.TAB_DELETE_CONFLICT_TEXT });
      return;
    }
    if (svc.showAlert) {
      svc.showAlert({
        code: firstCode || _codes.APPLY_FAILED,
        severity: "error",
        title: _defaults.TAB_DELETE_FAILED_TITLE,
        message: buildDeleteFailedText(mutationResult)
      });
    }
  }

  function readPrimaryCode(mutationResult) {
    if (Array.isArray(mutationResult.diagnostics) && mutationResult.diagnostics[0] && mutationResult.diagnostics[0].code) {
      return mutationResult.diagnostics[0].code;
    }
    return mutationResult.errorCode || null;
  }

  function buildDeleteFailedText(mutationResult) {
    var outcome = mutationResult.outcome ? " (" + mutationResult.outcome + ")" : "";
    var details = Array.isArray(mutationResult.diagnostics) ? mutationResult.diagnostics.map(function (entry) { return entry.code || "unknown"; }).join(", ") : "no diagnostics";
    return "Die Registerkarte konnte nicht gelöscht werden" + outcome + ". Details: " + details + ".";
  }

  return confirmAndDispatchTabDelete;
});
