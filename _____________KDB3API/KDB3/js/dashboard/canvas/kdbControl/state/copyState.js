define(["../settings/config/settingsDimensionConfig", "../settings/config/settingsColorDefaults"], function (_dimCfg, _colorDefaults) {
  "use strict";
  function shallowCopy(obj) {
    var o = {};
    var k;
    for (k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) o[k] = obj[k];
    return o;
  }
  function copyState(state) {
    return shallowCopy(state);
  }
  function copyFramework(fw) {
    var f = shallowCopy(fw);
    f.placeholderInputs = shallowCopy(fw.placeholderInputs || {});
    f.placeholderSelections = shallowCopy(fw.placeholderSelections || {});
    return f;
  }
  function defaultSettingsShape() {
    return {
      dashboard: {
        width: _dimCfg.dashboard.width.default,
        height: _dimCfg.dashboard.height.default,
        backgroundColor: _colorDefaults.colorInputs.dashboardBg,
        hideWidgetSettingsButtons: true,
        isDeveloperMode: false,
      },
      controlPanel: {
        backgroundColor: _colorDefaults.colorInputs.panelBg,
        buttonColor: _colorDefaults.colorInputs.panelButton,
        actionButtonColor: _colorDefaults.colorInputs.panelActionButton,
        innerBackgroundColor: _colorDefaults.colorInputs.panelInnerBg,
      },
      defaultsNew: {
        visualization: {
          width: _dimCfg.visualization.width.default,
          height: _dimCfg.visualization.height.default,
          backgroundColor: _colorDefaults.colorInputs.graphBg,
        },
        comment: {
          width: _dimCfg.comment.width.default,
          height: _dimCfg.comment.height.default,
          backgroundColor: _colorDefaults.colorInputs.commentBg,
        },
      },
    };
  }
  function copySettingsFromState(state) {
    var cur = (state && state.settings) || defaultSettingsShape();
    var d = cur.dashboard || {};
    var cp = cur.controlPanel || {};
    var dn = cur.defaultsNew || {};
    var vis = dn.visualization || {};
    var com = dn.comment || {};
    var next = shallowCopy(cur);
    next.dashboard = shallowCopy(d);
    next.controlPanel = shallowCopy(cp);
    next.defaultsNew = shallowCopy(dn);
    next.defaultsNew.visualization = shallowCopy(vis);
    next.defaultsNew.comment = shallowCopy(com);
    return next;
  }
  return {
    copyState: copyState,
    copyFramework: copyFramework,
    copySettingsFromState: copySettingsFromState,
  };
});
