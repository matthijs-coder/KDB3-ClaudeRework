define([
  "../events/eventNames",
  "./config/settingsDimensionConfig",
  "./parseDimensionLength",
  "./warnSettingsMessage",
], function (_eventNames, _dimCfg, _parse, _warn) {
  "use strict";
  function metaForAction(action) {
    var t = action && action.type;
    var p = action && action.payload;
    if (!p) return null;
    if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION) {
      if (p.dimension === "width") return { fieldId: "dashboardWidth", minimum: _dimCfg.dashboard.width.minimum };
      if (p.dimension === "height") return { fieldId: "dashboardHeight", minimum: _dimCfg.dashboard.height.minimum };
      return null;
    }
    if (t === _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT) {
      if (p.field === "width") return { fieldId: "graphWidth", minimum: _dimCfg.visualization.width.minimum };
      if (p.field === "height") return { fieldId: "graphHeight", minimum: _dimCfg.visualization.height.minimum };
      return null;
    }
    if (t === _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT) {
      if (p.field === "width") return { fieldId: "commentWidth", minimum: _dimCfg.comment.width.minimum };
      if (p.field === "height") return { fieldId: "commentHeight", minimum: _dimCfg.comment.height.minimum };
      return null;
    }
    return null;
  }
  function cloneActionWithValue(action, nextValue) {
    var next = {
      type: action.type,
      payload: Object.assign({}, action.payload, { value: nextValue }),
    };
    if (action.commitOptions) {
      next.commitOptions = action.commitOptions;
    }
    return next;
  }
  /**
   * @returns {{ proceed: boolean, action?: object }}
   */
  function gateSettingsDimensionAction(_KDB, action) {
    var meta = metaForAction(action);
    if (!meta) return { proceed: true, action: action };
    var raw = action.payload && action.payload.value;
    var parsed = _parse.parseDimensionLength(raw);
    if (!parsed.ok) {
      _warn.warnSettingsMessage(_KDB, {
        code: "KDB_CONTROL_SETTINGS_DIMENSION_INVALID",
        message: parsed.message,
        fieldId: meta.fieldId,
        severity: "warning",
      });
      return { proceed: false };
    }
    var minParsed = _parse.parseDimensionLength(meta.minimum);
    if (!minParsed.ok) {
      console.warn("[kdbControl] settingsDimensionConfig minimum entry is invalid:", meta.minimum);
      return { proceed: true, action: cloneActionWithValue(action, parsed.normalized) };
    }
    var inPx = _parse.dimensionToCssPx(parsed.amount, parsed.unit);
    var minPx = _parse.dimensionToCssPx(minParsed.amount, minParsed.unit);
    if (!isFinite(inPx) || !isFinite(minPx)) {
      _warn.warnSettingsMessage(_KDB, {
        code: "KDB_CONTROL_SETTINGS_DIMENSION_INVALID",
        message: "Invalid dimension: could not compare to configured minimum.",
        fieldId: meta.fieldId,
        severity: "warning",
      });
      return { proceed: false };
    }
    if (inPx + 1e-6 < minPx) {
      _warn.warnSettingsMessage(_KDB, {
        code: "KDB_CONTROL_SETTINGS_DIMENSION_MIN_APPLIED",
        message: "Value was below the minimum; minimum " + meta.minimum + " has been applied.",
        fieldId: meta.fieldId,
        severity: "info",
      });
      return { proceed: true, action: cloneActionWithValue(action, meta.minimum) };
    }
    return { proceed: true, action: cloneActionWithValue(action, parsed.normalized) };
  }
  return { gateSettingsDimensionAction: gateSettingsDimensionAction };
});
