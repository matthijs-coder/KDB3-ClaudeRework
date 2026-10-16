define(["./actionTypes.js", "./initialState.js"], function (_types, _initialState) {
  "use strict";

  var PANEL_IDS = { metrics: 1, toolbox: 1, settings: 1 };
  var CONTROL_PANEL_KEYS = {
    background: "backgroundColor",
    button: "buttonColor",
    actionButton: "actionButtonColor",
    innerBackground: "innerBackgroundColor"
  };
  var DASHBOARD_DIMENSIONS = { width: 1, height: 1 };
  var WIDGET_DEFAULT_FIELDS = { width: 1, height: 1, backgroundColor: 1 };
  var UNCHANGED = {};

  function has(map, key) {
    return typeof key === "string" && Object.prototype.hasOwnProperty.call(map, key);
  }

  function copyShallow(source) {
    return Object.assign({}, source);
  }

  function copyFramework(framework) {
    var copy = copyShallow(framework);
    copy.placeholderInputs = copyShallow(framework.placeholderInputs || {});
    copy.placeholderSelections = copyShallow(framework.placeholderSelections || {});
    return copy;
  }

  function copySettings(state) {
    var current = (state && state.settings) || _initialState().settings;
    var defaultsNew = current.defaultsNew || {};
    var next = copyShallow(current);
    next.dashboard = copyShallow(current.dashboard || {});
    next.controlPanel = copyShallow(current.controlPanel || {});
    next.defaultsNew = copyShallow(defaultsNew);
    next.defaultsNew.visualization = copyShallow(defaultsNew.visualization || {});
    next.defaultsNew.comment = copyShallow(defaultsNew.comment || {});
    return next;
  }

  function readValueText(payload) {
    return String(payload && payload.value != null ? payload.value : "");
  }

  function writeFramework(state, mutate) {
    var framework = state.framework || {};
    var next = copyShallow(state);
    var copy = copyFramework(framework);
    mutate(copy, framework);
    next.framework = copy;
    return next;
  }

  // `mutate` may return UNCHANGED to keep the previous state object.
  function writeSettings(state, mutate) {
    var next = copyShallow(state);
    next.settings = copySettings(state);
    return mutate(next.settings) === UNCHANGED ? state : next;
  }

  function reduceError(state, action) {
    var next = copyShallow(state || {});
    next.lifecycle = "error";
    next.errorCode = action.payload && action.payload.errorCode;
    next.errorMessage = action.payload && action.payload.errorMessage;
    return next;
  }

  function reduceInit(state) {
    var next = copyShallow(state);
    next.lifecycle = "mounted";
    return next;
  }

  function reduceDestroy(state) {
    var next = copyShallow(state);
    next.lifecycle = "disposed";
    return next;
  }

  function reduceSelectPanel(state, action) {
    var panelId = action.payload && action.payload.panelId;
    var current = (state.framework || {}).activeTopPanel;
    if (!has(PANEL_IDS, panelId)) return state;
    // Clicking the open toolbox/settings panel again returns to the metrics panel.
    var target = panelId === current && (current === "toolbox" || current === "settings") ? "metrics" : panelId;
    return writeFramework(state, function (framework) {
      if (target !== current) framework.openSectionId = null;
      framework.activeTopPanel = target;
    });
  }

  function reduceToggleCollapse(state, action) {
    var payload = action.payload;
    return writeFramework(state, function (framework, previous) {
      framework.isCollapsed = payload && typeof payload.isCollapsed === "boolean" ? payload.isCollapsed : !previous.isCollapsed;
    });
  }

  function reduceToggleSection(state, action) {
    var sectionId = action.payload && action.payload.sectionId;
    if (typeof sectionId !== "string" || !sectionId) return state;
    return writeFramework(state, function (framework, previous) {
      framework.openSectionId = previous.openSectionId === sectionId ? null : sectionId;
    });
  }

  function reduceSetPlaceholderInput(state, action) {
    var inputId = action.payload && action.payload.inputId;
    var value = action.payload && action.payload.value;
    if (typeof inputId !== "string" || !inputId) return state;
    return writeFramework(state, function (framework) {
      framework.placeholderInputs[inputId] = value == null ? "" : String(value);
    });
  }

  function reduceSetPlaceholderSelection(state, action) {
    var controlId = action.payload && action.payload.controlId;
    var value = action.payload && action.payload.value;
    if (typeof controlId !== "string" || !controlId) return state;
    return writeFramework(state, function (framework) {
      framework.placeholderSelections[controlId] = value == null ? "" : String(value);
    });
  }

  function reduceSetDashboardDimension(state, action) {
    var dimension = action.payload && action.payload.dimension;
    if (!has(DASHBOARD_DIMENSIONS, dimension)) return state;
    return writeSettings(state, function (settings) {
      settings.dashboard[dimension] = readValueText(action.payload);
    });
  }

  function reduceSetDashboardColor(state, action) {
    var payload = action.payload;
    if (!payload || typeof payload.value === "undefined") return state;
    return writeSettings(state, function (settings) {
      settings.dashboard.backgroundColor = readValueText(payload);
    });
  }

  function reduceSetControlPanelColor(state, action) {
    var role = action.payload && action.payload.role;
    if (!has(CONTROL_PANEL_KEYS, role)) return state;
    return writeSettings(state, function (settings) {
      settings.controlPanel[CONTROL_PANEL_KEYS[role]] = readValueText(action.payload);
    });
  }

  function reduceSetWidgetDefault(group) {
    return function (state, action) {
      var field = action.payload && action.payload.field;
      if (!has(WIDGET_DEFAULT_FIELDS, field)) return state;
      return writeSettings(state, function (settings) {
        settings.defaultsNew[group][field] = readValueText(action.payload);
      });
    };
  }

  function reduceToggleDashboardChrome(state, action) {
    var key = action.payload && action.payload.key;
    if (key !== "hideWidgetSettingsButtons") return state;
    return writeSettings(state, function (settings) {
      settings.dashboard[key] = !settings.dashboard[key];
    });
  }

  function reduceSetDashboardChrome(state, action) {
    var payload = action.payload;
    var key = payload && payload.key;
    if (key !== "hideWidgetSettingsButtons" || typeof payload.hidden !== "boolean") return state;
    return writeSettings(state, function (settings) {
      if (settings.dashboard[key] === payload.hidden) return UNCHANGED;
      settings.dashboard[key] = payload.hidden;
      return undefined;
    });
  }

  function reduceToggleDeveloperMode(state) {
    return writeSettings(state, function (settings) {
      settings.dashboard.isDeveloperMode = !settings.dashboard.isDeveloperMode;
    });
  }

  function reduceSetDeveloperMode(state, action) {
    var value = !!(action.payload && action.payload.value);
    var dashboard = state.settings && state.settings.dashboard;
    if (value === !!(dashboard && dashboard.isDeveloperMode)) return state;
    return writeSettings(state, function (settings) {
      settings.dashboard.isDeveloperMode = value;
    });
  }

  var REDUCERS = {};
  REDUCERS[_types.ACTION_INIT] = reduceInit;
  REDUCERS[_types.ACTION_DESTROY] = reduceDestroy;
  REDUCERS[_types.ACTION_FRAMEWORK_SELECT_PANEL] = reduceSelectPanel;
  REDUCERS[_types.ACTION_FRAMEWORK_TOGGLE_COLLAPSE] = reduceToggleCollapse;
  REDUCERS[_types.ACTION_FRAMEWORK_TOGGLE_SECTION] = reduceToggleSection;
  REDUCERS[_types.ACTION_FRAMEWORK_SET_PLACEHOLDER_INPUT] = reduceSetPlaceholderInput;
  REDUCERS[_types.ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION] = reduceSetPlaceholderSelection;
  REDUCERS[_types.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION] = reduceSetDashboardDimension;
  REDUCERS[_types.ACTION_SETTINGS_SET_DASHBOARD_COLOR] = reduceSetDashboardColor;
  REDUCERS[_types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR] = reduceSetControlPanelColor;
  REDUCERS[_types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT] = reduceSetWidgetDefault("visualization");
  REDUCERS[_types.ACTION_SETTINGS_SET_COMMENT_DEFAULT] = reduceSetWidgetDefault("comment");
  REDUCERS[_types.ACTION_SETTINGS_TOGGLE_DASHBOARD_CHROME] = reduceToggleDashboardChrome;
  REDUCERS[_types.ACTION_SETTINGS_SET_DASHBOARD_CHROME] = reduceSetDashboardChrome;
  REDUCERS[_types.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE] = reduceToggleDeveloperMode;
  REDUCERS[_types.ACTION_SETTINGS_SET_DEVELOPER_MODE] = reduceSetDeveloperMode;

  function reduceKdbControl(state, action) {
    if (!action) return state;
    if (action.type === _types.ACTION_ERROR) return reduceError(state, action);
    if (!state) return state;
    return has(REDUCERS, action.type) ? REDUCERS[action.type](state, action) : state;
  }

  return reduceKdbControl;
});
