define([
  "../state/commitWidgetSettingValue.js",
  "../config/dropdownDefaults.js",
  "../view/stampPanelVisType.js",
  "../view/resolvePanel.js",
  "../../widgetVis/config/visTypes/resolveVisTypeIdentity.js"
], function (_commitWidgetSettingValue, _dropdownDefaults, _stampPanelVisType, _resolvePanel, _resolveVisTypeIdentity) {
  "use strict";

  var FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  var VIS_DEFAULTS = {
    visualization: _dropdownDefaults.visualization.useValue,
    dimension: _dropdownDefaults.dimension.useValue,
    topN: _dropdownDefaults.topN.useValue
  };
  var TXT_DEFAULTS = {
    fontSize: _dropdownDefaults.fontSize.useValue,
    layout: _dropdownDefaults.layout.useValue,
    backgroundColor: _dropdownDefaults.backgroundColor.useValue
  };

  async function commitVisAndConsequences(_KDB, _widgetId, _entry, _meta, _diagnostics, _entryIndex) {
    commitRequiredSetting(_KDB, _widgetId, "visualization", _entry, "type", VIS_DEFAULTS.visualization);
    commitRequiredSetting(_KDB, _widgetId, "dimension", _entry, "dim", VIS_DEFAULTS.dimension);
    commitRequiredSetting(_KDB, _widgetId, "topN", _entry, "topn", VIS_DEFAULTS.topN);
    if (Object.prototype.hasOwnProperty.call(_entry || {}, "vals")) {
      commitDirect(_KDB, _widgetId, "showValues", _entry.vals === 1);
    }
    if (Object.prototype.hasOwnProperty.call(_entry || {}, "iter")) {
      commitDirect(_KDB, _widgetId, "iterator", _entry.iter === 1);
    }
    if (Object.prototype.hasOwnProperty.call(_entry || {}, "wzbar")) {
      commitDirect(_KDB, _widgetId, "zoom", _entry.wzbar === 1);
    }
    if (Object.prototype.hasOwnProperty.call(_entry || {}, "vcap")) {
      commitDirect(_KDB, _widgetId, "valueCaption", _entry.vcap === 1);
    }
    if (Object.prototype.hasOwnProperty.call(_entry || {}, "grp") && isAllowedGrain(_resolveVisTypeIdentity.resolveVisPropBucketKey(_entry.type, _KDB), _entry.grp)) {
      commitDirect(_KDB, _widgetId, "grouping", _entry.grp);
    }
    stampPanelIfMounted(_KDB, _widgetId);
    if (!Object.prototype.hasOwnProperty.call(_entry || {}, "ctcol")) {
      return { ok: true };
    }
    commitDirect(_KDB, _widgetId, "backgroundColor", _entry.ctcol);
    var action = {
      type: "widgetBase/applyColour",
      widgetId: _widgetId,
      payload: Object.assign({ optionValue: _entry.ctcol, widgetType: "vis" }, _meta || {})
    };
    return consequence(_KDB, "widgetBase", action, _diagnostics, _entryIndex, "ctcol");
  }

  async function commitTxtAndConsequences(_KDB, _widgetId, _entry, _meta, _diagnostics, _entryIndex) {
    commitRequiredSetting(_KDB, _widgetId, "fontSize", _entry, "fsize", TXT_DEFAULTS.fontSize);
    commitRequiredSetting(_KDB, _widgetId, "layout", _entry, "style", TXT_DEFAULTS.layout);
    commitRequiredSetting(_KDB, _widgetId, "backgroundColor", _entry, "bgcol", TXT_DEFAULTS.backgroundColor);
    if (Object.prototype.hasOwnProperty.call(_entry || {}, "fsize")) {
      var fontAction = {
        type: "widgetText/applyFontSize",
        widgetId: _widgetId,
        payload: Object.assign({ nextValue: _entry.fsize }, _meta || {})
      };
      var fontResult = await consequence(_KDB, "widgetText", fontAction, _diagnostics, _entryIndex, "fsize");
      if (!fontResult.ok) { return fontResult; }
    }
    if (Object.prototype.hasOwnProperty.call(_entry || {}, "style")) {
      var styleAction = {
        type: "widgetText/applyRestyle",
        widgetId: _widgetId,
        payload: Object.assign({ nextValue: _entry.style }, _meta || {})
      };
      var styleResult = await consequence(_KDB, "widgetText", styleAction, _diagnostics, _entryIndex, "style");
      if (!styleResult.ok) { return styleResult; }
    }
    if (!Object.prototype.hasOwnProperty.call(_entry || {}, "bgcol")) {
      return { ok: true };
    }
    var colourAction = {
      type: "widgetBase/applyColour",
      widgetId: _widgetId,
      payload: Object.assign({ optionValue: _entry.bgcol, widgetType: "text" }, _meta || {})
    };
    return consequence(_KDB, "widgetBase", colourAction, _diagnostics, _entryIndex, "bgcol");
  }

  function commitRequiredSetting(_KDB, _widgetId, _kind, _entry, _field, _defaultValue) {
    var value = Object.prototype.hasOwnProperty.call(_entry || {}, _field) ? _entry[_field] : _defaultValue;
    commitDirect(_KDB, _widgetId, _kind, value);
  }

  function commitDirect(_KDB, _widgetId, _kind, _value) {
    _commitWidgetSettingValue(_KDB, _widgetId, _kind, _value, { nextValue: _value });
  }

  function isAllowedGrain(_bucket, _grain) {
    if (_bucket === "List") { return _grain === "jahr" || _grain === "jahrStichtag"; }
    if (_bucket === "com.ibm.vis.custom.prognoseyearlinechart") { return false; }
    if (_bucket === "pie" || _bucket === "StackedBar" || _bucket === "StackedColumn") {
      return _grain === "jahr" || _grain === "jahrStichtag" || _grain === "stichtagProJahrH" || _grain === "stichtagProJahrV";
    }
    return _grain === "stichtag" || _grain === "jahr" || _grain === "jahrStichtag" || _grain === "stichtagProJahrH" || _grain === "stichtagProJahrV";
  }

  function stampPanelIfMounted(_KDB, _widgetId) {
    try {
      var panel = _resolvePanel(_KDB, _widgetId);
      if (!panel) {
        return;
      }
      _stampPanelVisType(_KDB, panel);
    } catch (err) {
      console.error("[widgetSettings.commitVisAndConsequences] stampPanelVisType failed", { widgetId: _widgetId }, err);
    }
  }

  async function consequence(_KDB, _apiKey, _action, _diagnostics, _entryIndex, _setting) {
    var api = _KDB.api && _KDB.api[_apiKey];
    if (!api || typeof api.dispatch !== "function") {
      _diagnostics.push({ code: FAILED, entryIndex: _entryIndex, setting: _setting, message: _apiKey + " dispatch API is unavailable." });
      return { ok: false };
    }
    var result = await Promise.resolve(api.dispatch(_action));
    if (!result || result.ok !== true) {
      _diagnostics.push({ code: FAILED, entryIndex: _entryIndex, setting: _setting, message: "Consequence dispatch failed." });
      return { ok: false };
    }
    return { ok: true };
  }

  return {
    commitVisAndConsequences: commitVisAndConsequences,
    commitTxtAndConsequences: commitTxtAndConsequences
  };
});
