define(["../events/eventNames"], function (_eventNames) {
  "use strict";

  var canvasDispatchMissingWarned = false;

  function dispatchCanvasIntent(_KDB, type, payload) {
    var api = _KDB && _KDB.api && _KDB.api.canvas;
    if (api && typeof api.dispatch === "function") {
      api.dispatch({ type: type, payload: payload });
      return;
    }
    if (!canvasDispatchMissingWarned) {
      canvasDispatchMissingWarned = true;
      console.warn(
        "[kdbControl] _KDB.api.canvas.dispatch is not available; deferred canvas owner intents are not delivered."
      );
    }
  }

  function maybeDispatchCanvasOwnerIntent(_KDB, action, nextState) {
    if (!action || !nextState || !nextState.settings) return;
    var d = nextState.settings.dashboard;
    if (!d) return;
    var t = action.type;
    if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION) {
      var dim = action.payload && action.payload.dimension;
      if (dim === "width") dispatchCanvasIntent(_KDB, "kdbControl.canvasIntent.dashboardWidth", { value: d.width });
      else if (dim === "height") dispatchCanvasIntent(_KDB, "kdbControl.canvasIntent.dashboardHeight", { value: d.height });
    } else if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_COLOR) {
      dispatchCanvasIntent(_KDB, "kdbControl.canvasIntent.dashboardBackgroundColor", { value: d.backgroundColor });
    }
  }

  function applyDeveloperModeAfterDispatch(_KDB, action, nextState) {
    try {
      if (!action || !nextState || !nextState.settings) return;
      var t = action.type;
      if (t !== _eventNames.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE && t !== _eventNames.ACTION_SETTINGS_SET_DEVELOPER_MODE) return;
      var d = nextState.settings.dashboard;
      if (!d) return;
      var fn = _KDB && _KDB.api && _KDB.api.properties && _KDB.api.properties.applyDeveloperMode;
      if (typeof fn !== "function") {
        console.error("[kdbControl] _KDB.api.properties.applyDeveloperMode is not available");
        return;
      }
      fn({ enabled: !!d.isDeveloperMode, source: (action.payload && action.payload.source) || "kdbControl" });
    } catch (err) {
      console.error("[kdbControl.settingsPostDispatchSideEffects] applyDeveloperModeAfterDispatch failed", err);
    }
  }

  function resolveCssColor(val) {
    var s = val == null ? "" : String(val).trim();
    return s.length ? s : null;
  }

  function setShellBackgroundColor(el, color, textFn) {
    if (!el) return;
    if (color) {
      el.style.backgroundColor = color;
      if (textFn) el.style.color = textFn(color);
    } else {
      el.style.removeProperty("background-color");
      el.style.removeProperty("color");
    }
  }

  function paintNodes(nodes, color, textFn, textOnly) {
    for (var i = 0; i < nodes.length; i++) {
      if (!textOnly) setShellBackgroundColor(nodes[i], color, textFn);
      else if (!color) nodes[i].style.removeProperty("color");
      else if (textFn) nodes[i].style.color = textFn(color);
    }
  }

  function applyControlPanelShellVisuals(_KDB) {
    var rt = _KDB && _KDB.runtime && _KDB.runtime.kdbControl;
    var dr = rt && rt.domRefs;
    var root = dr && dr.rootEl;
    if (!root) return;
    var st = _KDB.state && _KDB.state.kdbControl;
    var cp = st && st.settings && st.settings.controlPanel;
    if (!cp) return;
    var textFn = _KDB.utils && typeof _KDB.utils.readableTextColorForHex === "function" ? _KDB.utils.readableTextColorForHex : null;
    var panelBg = resolveCssColor(cp.backgroundColor);
    var panelBtn = resolveCssColor(cp.buttonColor);
    var panelAction = resolveCssColor(cp.actionButtonColor);
    var panelInner = resolveCssColor(cp.innerBackgroundColor);
    setShellBackgroundColor(dr.contentEl, panelBg, textFn);
    setShellBackgroundColor(dr.arrowEl, panelBtn, textFn);
    root.style.removeProperty("--kdb-control-steuerung-switch-on");
    paintNodes(root.querySelectorAll("#kdb-control-main-toggles .kdb-control__top-toggle.kdb-toggle, .kdb-control__section-head"), panelBtn, textFn);
    var headerBtns = root.querySelectorAll(".kdb-control__header-icon-button");
    for (var j = 0; j < headerBtns.length; j++) headerBtns[j].style.removeProperty("background-color");
    paintNodes(root.querySelectorAll(".kdb-control_action-button"), panelAction, textFn);
    setShellBackgroundColor(dr.settingsContainerEl, panelInner, textFn);
    setShellBackgroundColor(dr.metricsContainerEl, panelInner, textFn);
    paintNodes(root.querySelectorAll(".kdb-control__section-body-container"), panelInner, textFn);
    paintNodes(root.querySelectorAll(".kdb-control_input-label, .kdb-control_subheading, .kdb-control_toolbox-hint, .kdb-control_radio-group-label"), panelInner, textFn, true);
  }

  function serializeControlPanel(st) {
    var c = st && st.settings && st.settings.controlPanel;
    if (!c) return "";
    return (c.backgroundColor || "") + "\t" + (c.buttonColor || "") + "\t" + (c.actionButtonColor || "") + "\t" + (c.innerBackgroundColor || "");
  }

  function applyWidgetChromeAlwaysClass(_KDB) {
    try {
      var selector = _KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root && _KDB.elements.selectors.root.dashboardFrame;
      if (!selector) return;
      var frameEl = document.querySelector(selector);
      if (!frameEl) return;
      var dashboard = _KDB.state && _KDB.state.kdbControl && _KDB.state.kdbControl.settings && _KDB.state.kdbControl.settings.dashboard;
      frameEl.classList.toggle("kdb-widget-chrome-always", !!(dashboard && dashboard.hideWidgetSettingsButtons === false));
    } catch (err) {
      console.error("[kdbControl.applyWidgetChromeAlwaysClass] failed", err);
    }
  }

  function runAfterDispatch(_KDB, action, prevState, nextState, _commitOptions) {
    var forceApply = _commitOptions && _commitOptions.forceApply === true;
    maybeDispatchCanvasOwnerIntent(_KDB, action, nextState);
    applyDeveloperModeAfterDispatch(_KDB, action, nextState);
    if (forceApply || serializeControlPanel(prevState) !== serializeControlPanel(nextState)) {
      applyControlPanelShellVisuals(_KDB);
    }
    var t = action && action.type;
    var key = action && action.payload && action.payload.key;
    if (
      (t === _eventNames.ACTION_SETTINGS_TOGGLE_DASHBOARD_CHROME ||
        t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_CHROME) &&
      key === "hideWidgetSettingsButtons"
    ) {
      applyWidgetChromeAlwaysClass(_KDB);
    }
  }

  return {
    runAfterDispatch: runAfterDispatch,
    applyControlPanelShellVisuals: applyControlPanelShellVisuals,
    applyWidgetChromeAlwaysClass: applyWidgetChromeAlwaysClass,
  };
});
