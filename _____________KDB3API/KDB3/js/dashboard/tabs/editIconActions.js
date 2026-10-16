define([
  "./config.js",
  "./config/defaults.js",
  "./config/mutationCodes.js",
  "./slots.js"
], function (_config, _defaults, _codes, _slots) {
  "use strict";

  const MUTATION_UI = _config.mutationUi;

  function isTabMutationInFlight(_KDB) {
    return !!(_KDB && _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.pendingPromises && _KDB.runtime.tabs.pendingPromises.tabMutation);
  }

  function isIconEnabled(cfg, context) {
    if (isTabMutationInFlight(context && context._KDB)) { return false; }
    if (cfg.key === "delete") { return _defaults.TAB_DELETE_UI_ENABLED === true; }
    if (cfg.key === "move") { return _defaults.TAB_MOVE_UI_ENABLED === true; }
    if (cfg.key === "duplicate") { return _defaults.TAB_DUPLICATE_UI_ENABLED === true; }
    return false;
  }

  function bindIconClick(cfg, context, enabled, top, input, tabIndex, tabId, actionName, tabName) {
    const handler = enabled && MUTATION_UI[cfg.key]
      ? onMutationIconClick.bind(null, cfg.key, context && context._KDB, tabIndex, tabId)
      : onDeferredIconClick.bind(null, actionName, tabName, tabIndex);
    top.addEventListener("click", handler);
    input.addEventListener("click", handler);
  }

  // DOM click boundary. Legacy parity: the icon drops focus (no persistent
  // "selected" look; lets the focusout watchdog remove the icons) and the
  // rename session ends before the dialog opens, also when it is cancelled.
  async function onMutationIconClick(operation, _KDB, tabIndex, tabId, ev) {
    try {
      ev.preventDefault();
      ev.stopPropagation();
      blurIconTarget(ev);
      if (!_KDB) { return false; }
      endActiveEditSession(_KDB);
      await confirmAndDispatchTabMutation(_KDB, operation, { tabIndex: tabIndex, tabId: tabId });
      return false;
    } catch (err) {
      console.warn("[tabs.editIcon] " + operation + " click handling failed", err);
      return false;
    }
  }

  function onDeferredIconClick(actionName, tabName, tabIndex, ev) {
    ev.preventDefault();
    ev.stopPropagation();
    blurIconTarget(ev);
    console.log('[tabs.editIcon] ' + actionName + ' clicked for tab "' + tabName + '" (index ' + tabIndex + ')');
    return false;
  }

  function blurIconTarget(ev) {
    const el = ev && ev.target;
    if (el && typeof el.blur === "function") { el.blur(); }
  }

  // A failed rename commit must not block the icon action.
  function endActiveEditSession(_KDB) {
    try {
      const session = _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.editSession;
      if (session && typeof session.commit === "function") { session.commit(); }
    } catch (err) {
      console.warn("[tabs.editIcon] ending edit session failed", err);
    }
  }

  // Asks the user (confirm, or choose a position for move), dispatches the
  // mutation and surfaces a failed outcome. Fails closed without a message service.
  async function confirmAndDispatchTabMutation(_KDB, operation, _request) {
    const ui = MUTATION_UI[operation];
    const svc = _KDB.services && _KDB.services.message;
    try {
      const request = _request || {};
      if (isTabMutationInFlight(_KDB)) {
        if (svc && typeof svc.notify === "function") {
          svc.notify({ code: _codes.CONFLICT, severity: "warning", message: _defaults.TAB_DELETE_CONFLICT_TEXT });
        }
        return { ok: false, diagnostics: [{ code: _codes.CONFLICT }] };
      }
      if (!svc || typeof svc[ui.dialog.method] !== "function") {
        console.warn("[tabs.editIcon] messageService unavailable — " + operation + " blocked (fail closed)");
        return { ok: false, blocked: true };
      }
      const asked = await askForMutationPayload(_KDB, svc, ui, operation, request);
      if (!asked.ok) { return asked.result; }
      const result = await _KDB.api.tabs.dispatch({ type: ui.actionType, payload: asked.payload });
      if (!result || result.ok === true) { return result || { ok: true }; }
      console.warn("[tabs.editIcon] " + operation + " mutation failed", result);
      surfaceFailure(svc, ui, result);
      return result;
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      if (svc && typeof svc.showAlert === "function") {
        svc.showAlert({ code: "TABS_MUTATION_APPLY_FAILED", severity: "error", title: ui.failedTitle, message: message });
      }
      return { ok: false, diagnostics: [{ code: _codes.APPLY_FAILED, message: message }] };
    }
  }

  async function askForMutationPayload(_KDB, svc, ui, operation, request) {
    const dialog = ui.dialog;
    if (operation !== "move") {
      const confirmed = await svc.confirm({ code: dialog.code, title: dialog.title, message: dialog.message });
      if (!confirmed || confirmed.confirmed !== true) { return { ok: false, result: { ok: false, cancelled: true } }; }
      return { ok: true, payload: { tabIndex: request.tabIndex, tabId: request.tabId, source: "tabsEditUi" } };
    }
    const tabIndex = typeof request.tabIndex === "number" ? request.tabIndex : -1;
    const choices = buildPositionChoices(_KDB, tabIndex);
    if (!choices.length) { return { ok: false, result: { ok: false, blocked: true } }; }
    const chosen = await svc.choose({ code: dialog.code, title: dialog.title, message: dialog.message, choices: choices });
    const targetPosition = chosen && chosen.reason === "selected" && chosen.choice ? parseTargetPosition(chosen.choice) : -1;
    if (targetPosition < 0) { return { ok: false, result: { ok: false, cancelled: true } }; }
    return { ok: true, payload: { tabIndex: tabIndex, tabId: request.tabId, targetPosition: targetPosition, source: "tabsEditUi" } };
  }

  // Positions are 0-based visible dashboard slots; the tab's own slot is not offered.
  function buildPositionChoices(_KDB, tabIndex) {
    const visibleCount = _slots.countVisible(_slots.listDashboardSlots(_KDB.state && _KDB.state.tabs));
    const choices = [];
    for (let position = 0; position < visibleCount; position += 1) {
      if (position !== tabIndex) { choices.push({ id: "pos-" + position, label: String(position + 1), disabled: false }); }
    }
    return choices;
  }

  function parseTargetPosition(choiceId) {
    if (typeof choiceId !== "string" || choiceId.indexOf("pos-") !== 0) { return -1; }
    const parsed = Number(choiceId.slice(4));
    return Number.isFinite(parsed) ? parsed : -1;
  }

  function surfaceFailure(svc, ui, result) {
    const primaryCode = readPrimaryCode(result);
    if (result.outcome === "degraded" && svc.notify) {
      svc.notify({ code: primaryCode || _codes.HOST_RESYNC_FAILED, severity: "info", message: _defaults.TAB_MUTATION_DEGRADED_TEXT });
      return;
    }
    if (primaryCode === ui.guardCode && svc.notify) {
      svc.notify({ code: primaryCode, severity: "warning", message: ui.guardText });
      return;
    }
    if (primaryCode === _codes.CONFLICT && svc.notify) {
      svc.notify({ code: primaryCode, severity: "warning", message: _defaults.TAB_DELETE_CONFLICT_TEXT });
      return;
    }
    if (svc.showAlert) {
      const outcome = result.outcome ? " (" + result.outcome + ")" : "";
      const details = Array.isArray(result.diagnostics)
        ? result.diagnostics.map(function (entry) { return entry.code || "unknown"; }).join(", ")
        : "no diagnostics";
      svc.showAlert({
        code: primaryCode || _codes.APPLY_FAILED,
        severity: "error",
        title: ui.failedTitle,
        message: "Die Registerkarte konnte nicht " + ui.failedVerb + " werden" + outcome + ". Details: " + details + "."
      });
    }
  }

  function readPrimaryCode(result) {
    const first = Array.isArray(result.diagnostics) ? result.diagnostics[0] : null;
    return first && first.code ? first.code : result.errorCode || null;
  }

  return {
    isIconEnabled: isIconEnabled,
    bindIconClick: bindIconClick,
    confirmAndDispatchTabMutation: confirmAndDispatchTabMutation
  };
});
