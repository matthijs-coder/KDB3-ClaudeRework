define(["../events/eventNames", "./copyState"], function (_eventNames, _copyState) {
  "use strict";
  var PANEL_IDS = { metrics: 1, toolbox: 1, settings: 1 };
  function reduceFrameworkSelectPanel(state, action) {
    var panelId = action.payload && action.payload.panelId;
    var fw0 = state.framework || {};
    var cur = fw0.activeTopPanel;
    if (typeof panelId !== "string" || !PANEL_IDS[panelId]) return state;
    var target = panelId;
    /* Toolbox/Settings nogmaals klikken → terug naar Kennzahlen (metrics) */
    if (panelId === cur && (cur === "toolbox" || cur === "settings")) target = "metrics";
    var next = _copyState.copyState(state);
    var fw = _copyState.copyFramework(fw0);
    if (target !== cur) fw.openSectionId = null;
    fw.activeTopPanel = target;
    next.framework = fw;
    return next;
  }
  function reduceFrameworkToggleCollapse(state, action) {
    var fw0 = state.framework || {};
    var next = _copyState.copyState(state);
    var fw = _copyState.copyFramework(fw0);
    var p = action.payload;
    if (p && typeof p.isCollapsed === "boolean") fw.isCollapsed = p.isCollapsed;
    else fw.isCollapsed = !fw0.isCollapsed;
    next.framework = fw;
    return next;
  }
  function reduceFrameworkToggleSection(state, action) {
    var sid = action.payload && action.payload.sectionId;
    if (typeof sid !== "string" || !sid) return state;
    var fw0 = state.framework || {};
    var next = _copyState.copyState(state);
    var fw = _copyState.copyFramework(fw0);
    fw.openSectionId = fw0.openSectionId === sid ? null : sid;
    next.framework = fw;
    return next;
  }
  function reduceFrameworkSetPlaceholderInput(state, action) {
    var inputId = action.payload && action.payload.inputId;
    var value = action.payload && action.payload.value;
    if (typeof inputId !== "string" || !inputId) return state;
    var fw0 = state.framework || {};
    var next = _copyState.copyState(state);
    var fw = _copyState.copyFramework(fw0);
    fw.placeholderInputs[inputId] = value == null ? "" : String(value);
    next.framework = fw;
    return next;
  }
  function reduceFrameworkSetPlaceholderSelection(state, action) {
    /* CP-1: no cascade/mirror for header/footer chrome; owners own _KDB.state.header/footer. */
    var controlId = action.payload && action.payload.controlId;
    var value = action.payload && action.payload.value;
    if (typeof controlId !== "string" || !controlId) return state;
    var fw0 = state.framework || {};
    var next = _copyState.copyState(state);
    var fw = _copyState.copyFramework(fw0);
    fw.placeholderSelections[controlId] = value == null ? "" : String(value);
    next.framework = fw;
    return next;
  }
  function reduceFrameworkActions(state, action) {
    var t = action.type;
    if (t === _eventNames.ACTION_FRAMEWORK_SELECT_PANEL) return reduceFrameworkSelectPanel(state, action);
    if (t === _eventNames.ACTION_FRAMEWORK_TOGGLE_COLLAPSE) return reduceFrameworkToggleCollapse(state, action);
    if (t === _eventNames.ACTION_FRAMEWORK_TOGGLE_SECTION) return reduceFrameworkToggleSection(state, action);
    if (t === _eventNames.ACTION_FRAMEWORK_SET_PLACEHOLDER_INPUT) return reduceFrameworkSetPlaceholderInput(state, action);
    if (t === _eventNames.ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION) {
      return reduceFrameworkSetPlaceholderSelection(state, action);
    }
    return state;
  }
  return reduceFrameworkActions;
});
