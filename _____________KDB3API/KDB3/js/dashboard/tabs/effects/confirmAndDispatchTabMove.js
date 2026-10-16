define([
  "../config/defaults.js",
  "../config/mutationCodes.js",
  "../state/buildTabMutationPlan.js",
  "../slots.js"
], function (_defaults, _codes, _buildTabMutationPlan, _slots) {
  "use strict";

  async function confirmAndDispatchTabMove(_KDB, _request) {
    try {
      var request = _request || {};
      var svc = _KDB.services && _KDB.services.message;
      if (_KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.pendingPromises && _KDB.runtime.tabs.pendingPromises.tabMutation) {
        if (svc && typeof svc.notify === "function") {
          svc.notify({ code: _codes.CONFLICT, severity: "warning", message: _defaults.TAB_DELETE_CONFLICT_TEXT });
        }
        return { ok: false, diagnostics: [{ code: _codes.CONFLICT }] };
      }
      if (!svc || typeof svc.choose !== "function") {
        console.warn("[tabs.editIcon] messageService unavailable — move blocked (fail closed)");
        return { ok: false, blocked: true };
      }
      var tabIndex = typeof request.tabIndex === "number" ? request.tabIndex : -1;
      var choices = buildPositionChoices(_KDB, tabIndex);
      if (!choices.length) { return { ok: false, blocked: true }; }
      var result = await svc.choose({
        code: "TABS_MOVE_CHOOSE",
        title: _defaults.TAB_MOVE_CHOOSE_TITLE,
        message: _defaults.TAB_MOVE_CHOOSE_TEXT,
        choices: choices
      });
      if (!result || result.reason !== "selected" || !result.choice) { return { ok: false, cancelled: true }; }
      var targetPosition = parseTargetPosition(result.choice);
      if (targetPosition < 0) { return { ok: false, cancelled: true }; }
      var mutationResult = await _KDB.api.tabs.dispatch({
        type: "tabs/move",
        payload: { tabIndex: tabIndex, tabId: request.tabId, targetPosition: targetPosition, source: "tabsEditUi" }
      });
      if (!mutationResult || mutationResult.ok === true) { return mutationResult || { ok: true }; }
      console.warn("[tabs.editIcon] move mutation failed", mutationResult);
      surfaceFailure(svc, mutationResult);
      return mutationResult;
    } catch (err) {
      var svc = _KDB.services && _KDB.services.message;
      if (svc && typeof svc.showAlert === "function") {
        svc.showAlert({ code: "TABS_MUTATION_APPLY_FAILED", severity: "error", title: _defaults.TAB_MOVE_FAILED_TITLE, message: String(err && err.message ? err.message : err) });
      }
      return { ok: false, diagnostics: [{ code: _codes.APPLY_FAILED, message: String(err && err.message ? err.message : err) }] };
    }
  }

  function buildPositionChoices(_KDB, _tabIndex) {
    var slots = _slots.listDashboardSlots(_KDB.state && _KDB.state.tabs);
    var visibleCount = _buildTabMutationPlan.countVisible(slots);
    var choices = [];
    for (var i = 0; i < visibleCount; i += 1) {
      if (i === _tabIndex) { continue; }
      choices.push({ id: "pos-" + i, label: String(i + 1), disabled: false });
    }
    return choices;
  }

  function parseTargetPosition(_choiceId) {
    if (typeof _choiceId !== "string" || _choiceId.indexOf("pos-") !== 0) { return -1; }
    var parsed = Number(_choiceId.slice(4));
    return Number.isFinite(parsed) ? parsed : -1;
  }

  function surfaceFailure(svc, mutationResult) {
    if (mutationResult.outcome === "degraded" && svc.notify) {
      svc.notify({
        code: (Array.isArray(mutationResult.diagnostics) && mutationResult.diagnostics[0] && mutationResult.diagnostics[0].code) || _codes.HOST_RESYNC_FAILED,
        severity: "info",
        message: _defaults.TAB_MUTATION_DEGRADED_TEXT
      });
      return;
    }
    var firstCode = (Array.isArray(mutationResult.diagnostics) && mutationResult.diagnostics[0] && mutationResult.diagnostics[0].code) || mutationResult.errorCode || null;
    if (firstCode === _codes.SAME_POSITION && svc.notify) {
      svc.notify({ code: firstCode, severity: "warning", message: _defaults.TAB_MOVE_CHOOSE_TEXT });
      return;
    }
    if (firstCode === _codes.CONFLICT && svc.notify) {
      svc.notify({ code: firstCode, severity: "warning", message: _defaults.TAB_DELETE_CONFLICT_TEXT });
      return;
    }
    if (svc.showAlert) {
      var outcome = mutationResult.outcome ? " (" + mutationResult.outcome + ")" : "";
      var details = Array.isArray(mutationResult.diagnostics) ? mutationResult.diagnostics.map(function (entry) { return entry.code || "unknown"; }).join(", ") : "no diagnostics";
      svc.showAlert({ code: firstCode || _codes.APPLY_FAILED, severity: "error", title: _defaults.TAB_MOVE_FAILED_TITLE, message: "Die Registerkarte konnte nicht verschoben werden" + outcome + ". Details: " + details + "." });
    }
  }

  return confirmAndDispatchTabMove;
});
