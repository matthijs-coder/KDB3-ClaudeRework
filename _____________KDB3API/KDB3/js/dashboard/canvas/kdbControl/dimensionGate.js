define([
  "./state/actionTypes.js",
  "./config/settingsDefaults.js"
], function (_types, _defaults) {
  "use strict";

  var DIMENSIONS = _defaults.dimensions;
  var DIMENSION_INVALID = "KDB_CONTROL_SETTINGS_DIMENSION_INVALID";
  var DIMENSION_MIN_APPLIED = "KDB_CONTROL_SETTINGS_DIMENSION_MIN_APPLIED";
  var SEVERITIES = { info: 1, success: 1, warning: 1, error: 1 };

  // Gated actions: type -> payload key and per-value field id and minimum.
  var GATED_ACTIONS = {};
  GATED_ACTIONS[_types.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION] = {
    key: "dimension",
    fields: {
      width: { fieldId: "dashboardWidth", minimum: DIMENSIONS.dashboard.width.minimum },
      height: { fieldId: "dashboardHeight", minimum: DIMENSIONS.dashboard.height.minimum }
    }
  };
  GATED_ACTIONS[_types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT] = {
    key: "field",
    fields: {
      width: { fieldId: "graphWidth", minimum: DIMENSIONS.visualization.width.minimum },
      height: { fieldId: "graphHeight", minimum: DIMENSIONS.visualization.height.minimum }
    }
  };
  GATED_ACTIONS[_types.ACTION_SETTINGS_SET_COMMENT_DEFAULT] = {
    key: "field",
    fields: {
      width: { fieldId: "commentWidth", minimum: DIMENSIONS.comment.width.minimum },
      height: { fieldId: "commentHeight", minimum: DIMENSIONS.comment.height.minimum }
    }
  };

  function dimensionToCssPx(amount, unit) {
    var lower = String(unit || "").toLowerCase();
    if (lower === "px") return amount;
    if (lower === "mm") return amount * (96 / 25.4);
    if (lower === "cm") return amount * 10 * (96 / 25.4);
    return NaN;
  }

  function formatAmount(amount) {
    if (!isFinite(amount) || amount < 0) return null;
    var rounded = Math.round(amount * 1e6) / 1e6;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
    var text = String(rounded);
    if (text.indexOf("e") >= 0) return text;
    return text.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }

  function invalidDimension(message) {
    return { ok: false, message: message, normalized: "" };
  }

  function parseDimensionLength(raw) {
    var text = (raw == null ? "" : String(raw)).trim();
    if (!text.length) return invalidDimension("Dimension is required (empty value is not allowed).");
    var match = text.match(/^\s*(\d+(?:\.\d+)?)\s*(mm|cm|px)\s*$/i);
    if (!match) {
      if (/^\s*\d/.test(text) && !/\s*(mm|cm|px)\s*$/i.test(text)) {
        return invalidDimension("Invalid dimension: a unit is required. Use mm, cm, or px (e.g. 200mm, 10cm, 800px).");
      }
      return invalidDimension("Invalid dimension format. Allowed: <number>mm, <number>cm, or <number>px (spaces trimmed).");
    }
    var amount = parseFloat(match[1]);
    if (!isFinite(amount)) return invalidDimension("Invalid dimension: number is not valid.");
    if (amount < 0) return invalidDimension("Invalid dimension: negative values are not allowed.");
    if (amount === 0) return invalidDimension("Invalid dimension: value must be greater than zero.");
    var unit = String(match[2]).toLowerCase();
    var formatted = formatAmount(amount);
    if (formatted == null) return invalidDimension("Invalid dimension: number is not valid.");
    return { ok: true, normalized: formatted + unit, amount: amount, unit: unit };
  }

  function warnSettingsMessage(_KDB, payload) {
    var service = _KDB && _KDB.services && _KDB.services.message;
    var severity = SEVERITIES[payload.severity] === 1 ? payload.severity : "warning";
    if (service && typeof service.notify === "function") {
      var anchor = payload.fieldId ? document.getElementById(payload.fieldId) : null;
      var notification = { code: payload.code, message: payload.message, severity: severity };
      try {
        if (anchor && typeof service.notifyAnchored === "function") {
          notification.anchor = anchor;
          service.notifyAnchored(notification);
        } else {
          service.notify(notification);
        }
      } catch (err) {
        console.warn("[kdbControl] services.message notification failed", err);
      }
      return;
    }
    console.warn("[kdbControl]", payload.code || "settingsMessage", payload.message != null ? payload.message : "",
      payload.fieldId != null ? "(" + payload.fieldId + ")" : "");
  }

  function readGateTarget(action) {
    var payload = action && action.payload;
    var route = action && Object.prototype.hasOwnProperty.call(GATED_ACTIONS, action.type) ? GATED_ACTIONS[action.type] : null;
    if (!payload || !route) return null;
    var field = payload[route.key];
    return typeof field === "string" && Object.prototype.hasOwnProperty.call(route.fields, field) ? route.fields[field] : null;
  }

  function cloneActionWithValue(action, value) {
    var next = { type: action.type, payload: Object.assign({}, action.payload, { value: value }) };
    if (action.commitOptions) next.commitOptions = action.commitOptions;
    return next;
  }

  // Validates dimension actions against their configured minimum.
  // Returns { proceed: boolean, action?: object }.
  function gateSettingsDimensionAction(_KDB, action) {
    var target = readGateTarget(action);
    if (!target) return { proceed: true, action: action };
    var parsed = parseDimensionLength(action.payload && action.payload.value);
    if (!parsed.ok) {
      warnSettingsMessage(_KDB, { code: DIMENSION_INVALID, message: parsed.message, fieldId: target.fieldId, severity: "warning" });
      return { proceed: false };
    }
    var minimum = parseDimensionLength(target.minimum);
    if (!minimum.ok) {
      console.warn("[kdbControl] settings dimension minimum entry is invalid:", target.minimum);
      return { proceed: true, action: cloneActionWithValue(action, parsed.normalized) };
    }
    var valuePx = dimensionToCssPx(parsed.amount, parsed.unit);
    var minimumPx = dimensionToCssPx(minimum.amount, minimum.unit);
    if (!isFinite(valuePx) || !isFinite(minimumPx)) {
      warnSettingsMessage(_KDB, {
        code: DIMENSION_INVALID,
        message: "Invalid dimension: could not compare to configured minimum.",
        fieldId: target.fieldId,
        severity: "warning"
      });
      return { proceed: false };
    }
    if (valuePx + 1e-6 < minimumPx) {
      warnSettingsMessage(_KDB, {
        code: DIMENSION_MIN_APPLIED,
        message: "Value was below the minimum; minimum " + target.minimum + " has been applied.",
        fieldId: target.fieldId,
        severity: "info"
      });
      return { proceed: true, action: cloneActionWithValue(action, target.minimum) };
    }
    return { proceed: true, action: cloneActionWithValue(action, parsed.normalized) };
  }

  return { gateSettingsDimensionAction: gateSettingsDimensionAction };
});
