define(["./sanitizeAttachmentText.js"], function (_sanitizeAttachmentText) {
  "use strict";

  var ORDERED_LABELS = ["Sicht", "Jahr", "Dienststelle", "Berufsfamilie", "Dienstverhältnis", "Geschlecht", "Altersgruppe", "Dienststellenleitung", "Personengruppe"];
  var DISPLAY_SOURCE_ALLOWLIST = { cognos: true, table: true, policy: true };
  var SPECIAL_LABEL_GUARD = { Dienststellenleitung: true, Personengruppe: true };

  function toDisplay(_value) {
    return _sanitizeAttachmentText.cleanValue(_value == null ? "" : String(_value));
  }

  function pushMissingDisplayWarning(_warnings, _instanceId, _label, _source) {
    _warnings.push({
      code: "DASHBOARD_PDF_FILTER_DISPLAY_UNAVAILABLE",
      message: "Display value is unavailable for '" + _label + "' (" + _source + ").",
      filterInstanceId: _instanceId
    });
  }

  function readCanonicalDisplay(_instance, _warnings) {
    var selection = _instance && _instance.currentSelection;
    var source = selection && selection.displaySource ? String(selection.displaySource) : "";
    var display = selection ? selection.displayValue : null;
    var label = _sanitizeAttachmentText.cleanLabel(_instance && _instance.filterLabel);
    if (!DISPLAY_SOURCE_ALLOWLIST[source]) {
      pushMissingDisplayWarning(_warnings, _instance && _instance.filterInstanceId, label || "<unknown>", "invalid displaySource");
      return "";
    }
    if (display == null || toDisplay(display) === "") {
      pushMissingDisplayWarning(_warnings, _instance && _instance.filterInstanceId, label || "<unknown>", "missing displayValue");
      return "";
    }
    return toDisplay(display);
  }

  async function ensureFreshSingleSelectInventory(_KDB) {
    var singleSelectApi = _KDB.api && _KDB.api.singleSelect;
    var singleSelectState;
    var reconcileResult;
    if (!singleSelectApi || typeof singleSelectApi.getState !== "function" || typeof singleSelectApi.dispatch !== "function") {
      throw { code: "DASHBOARD_PDF_FILTER_PREPARATION_FAILED", message: "singleSelect API is unavailable." };
    }
    singleSelectState = singleSelectApi.getState() || {};
    if (singleSelectState.inventory && singleSelectState.inventory.freshness === "fresh") {
      return singleSelectState;
    }
    reconcileResult = await singleSelectApi.dispatch({
      type: "singleSelect/reconcileFilterInstances",
      payload: { reason: "filtersReady" }
    });
    singleSelectState = singleSelectApi.getState() || {};
    if (!reconcileResult || reconcileResult.ok !== true || !singleSelectState.inventory || singleSelectState.inventory.freshness !== "fresh") {
      throw {
        code: "DASHBOARD_PDF_FILTER_PREPARATION_FAILED",
        message: "singleSelect inventory is not fresh for dashboardPdf export."
      };
    }
    return singleSelectState;
  }

  function collectSpecialVisibility(_specialState) {
    var out = {};
    Object.keys(((_specialState || {}).byFilterId) || {}).forEach(function (id) {
      var record = _specialState.byFilterId[id];
      if (record && record.isVisible === true) out[_sanitizeAttachmentText.cleanLabel(record.filterLabel || id)] = true;
    });
    return out;
  }

  return {
    ORDERED_LABELS: ORDERED_LABELS,
    SPECIAL_LABEL_GUARD: SPECIAL_LABEL_GUARD,
    readCanonicalDisplay: readCanonicalDisplay,
    ensureFreshSingleSelectInventory: ensureFreshSingleSelectInventory,
    collectSpecialVisibility: collectSpecialVisibility
  };
});
