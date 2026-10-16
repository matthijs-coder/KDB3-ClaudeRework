define([
  "./state/actionTypes.js",
  "../../../core/utils/isRightAllowed.js",
  "../../../core/utils/readFirstRowScalar.js",
  "../../../core/authoring/selectors.js",
  "../../../core/events/authoringMode.js",
  "../../../core/utils/kit/runtime.js"
], function (_types, _isRightAllowed, _readFirstRowScalar, _readIsAuthoring, _authoringEvents, _rt) {
  "use strict";

  var SLOT_MOUNT_KEY = "kdb-control-save-load-slot-loading";
  var SLOT_RUNTIME_KEY = "saveLoadSlotLoading";
  var SLOT_LOADING_TIMEOUT_MS = 30000;
  var DEVELOPER_COLUMN_SELECTOR = ".kdb-control_dashboard-toggles-column--developer-mode-gated";
  var DEVELOPER_COLUMN_VISIBLE_CLASS = "kdb-control_dashboard-toggles-column--developer-mode-visible";
  var WIDGET_CHROME_CLASS = "kdb-widget-chrome-always";

  function readRuntime(_KDB) {
    return (_KDB && _KDB.runtime && _KDB.runtime.kdbControl) || null;
  }

  // Calls `_KDB.api.<owner>.dispatch(action)`. A missing owner API is reported once per owner and the action is dropped.
  function dispatchToOwnerApi(_KDB, owner, action) {
    var api = _KDB && _KDB.api && _KDB.api[owner];
    if (api && typeof api.dispatch === "function") {
      api.dispatch(action);
      return true;
    }
    var rt = readRuntime(_KDB);
    var warned = rt ? (rt.warnedMissingApis = rt.warnedMissingApis || {}) : null;
    if (!warned || warned[owner] !== true) {
      if (warned) warned[owner] = true;
      console.warn("[kdbControl] _KDB.api." + owner + ".dispatch is missing; actions for " + owner + " are ignored.");
    }
    return false;
  }

  function syncFrameworkView(_KDB) {
    var rt = readRuntime(_KDB);
    var ctx = rt && rt.frameworkBindContext;
    if (ctx && typeof ctx.syncView === "function") ctx.syncView();
  }

  function dispatchCanvasIntent(_KDB, type, payload) {
    dispatchToOwnerApi(_KDB, "canvas", { type: type, payload: payload });
  }

  function dispatchCanvasOwnerIntent(_KDB, action, nextState) {
    var dashboard = nextState && nextState.settings && nextState.settings.dashboard;
    if (!action || !dashboard) return;
    if (action.type === _types.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION) {
      var dimension = action.payload && action.payload.dimension;
      if (dimension === "width") dispatchCanvasIntent(_KDB, "kdbControl.canvasIntent.dashboardWidth", { value: dashboard.width });
      else if (dimension === "height") dispatchCanvasIntent(_KDB, "kdbControl.canvasIntent.dashboardHeight", { value: dashboard.height });
    } else if (action.type === _types.ACTION_SETTINGS_SET_DASHBOARD_COLOR) {
      dispatchCanvasIntent(_KDB, "kdbControl.canvasIntent.dashboardBackgroundColor", { value: dashboard.backgroundColor });
    }
  }

  function applyDeveloperModeAfterDispatch(_KDB, action, nextState) {
    var dashboard = nextState && nextState.settings && nextState.settings.dashboard;
    var isDeveloperAction = action && (action.type === _types.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE ||
      action.type === _types.ACTION_SETTINGS_SET_DEVELOPER_MODE);
    if (!isDeveloperAction || !dashboard) return;
    var applyDeveloperMode = _KDB && _KDB.api && _KDB.api.properties && _KDB.api.properties.applyDeveloperMode;
    if (typeof applyDeveloperMode !== "function") {
      console.error("[kdbControl] _KDB.api.properties.applyDeveloperMode is not available");
      return;
    }
    try {
      applyDeveloperMode({ enabled: !!dashboard.isDeveloperMode, source: (action.payload && action.payload.source) || "kdbControl" });
    } catch (err) {
      console.error("[kdbControl.applyDeveloperModeAfterDispatch] applyDeveloperMode failed", err);
    }
  }

  function readCssColor(value) {
    var text = value == null ? "" : String(value).trim();
    return text.length ? text : null;
  }

  function paintBackground(el, color, readTextColor) {
    if (!el) return;
    if (color) {
      el.style.backgroundColor = color;
      if (readTextColor) el.style.color = readTextColor(color);
    } else {
      el.style.removeProperty("background-color");
      el.style.removeProperty("color");
    }
  }

  function paintNodes(nodes, color, readTextColor, textOnly) {
    var index;
    for (index = 0; index < nodes.length; index += 1) {
      if (!textOnly) paintBackground(nodes[index], color, readTextColor);
      else if (!color) nodes[index].style.removeProperty("color");
      else if (readTextColor) nodes[index].style.color = readTextColor(color);
    }
  }

  function applyControlPanelShellVisuals(_KDB) {
    var rt = readRuntime(_KDB);
    var dr = rt && rt.domRefs;
    var root = dr && dr.rootEl;
    var panel = _KDB.state && _KDB.state.kdbControl && _KDB.state.kdbControl.settings && _KDB.state.kdbControl.settings.controlPanel;
    if (!root || !panel) return;
    var readTextColor = _KDB.utils && typeof _KDB.utils.readableTextColorForHex === "function" ? _KDB.utils.readableTextColorForHex : null;
    var panelBg = readCssColor(panel.backgroundColor);
    var panelBtn = readCssColor(panel.buttonColor);
    var panelAction = readCssColor(panel.actionButtonColor);
    var panelInner = readCssColor(panel.innerBackgroundColor);
    paintBackground(dr.contentEl, panelBg, readTextColor);
    paintBackground(dr.arrowEl, panelBtn, readTextColor);
    root.style.removeProperty("--kdb-control-steuerung-switch-on");
    paintNodes(root.querySelectorAll("#kdb-control-main-toggles .kdb-control__top-toggle.kdb-toggle, .kdb-control__section-head"),
      panelBtn, readTextColor);
    var headerButtons = root.querySelectorAll(".kdb-control__header-icon-button");
    var index;
    for (index = 0; index < headerButtons.length; index += 1) headerButtons[index].style.removeProperty("background-color");
    paintNodes(root.querySelectorAll(".kdb-control_action-button"), panelAction, readTextColor);
    paintBackground(dr.settingsContainerEl, panelInner, readTextColor);
    paintBackground(dr.metricsContainerEl, panelInner, readTextColor);
    paintNodes(root.querySelectorAll(".kdb-control__section-body-container"), panelInner, readTextColor);
    paintNodes(root.querySelectorAll(
      ".kdb-control_input-label, .kdb-control_subheading, .kdb-control_toolbox-hint, .kdb-control_radio-group-label"
    ), panelInner, readTextColor, true);
  }

  function serializeControlPanel(state) {
    var panel = state && state.settings && state.settings.controlPanel;
    if (!panel) return "";
    return [panel.backgroundColor || "", panel.buttonColor || "", panel.actionButtonColor || "", panel.innerBackgroundColor || ""].join("\t");
  }

  function applyWidgetChromeAlwaysClass(_KDB) {
    var selectors = _KDB && _KDB.elements && _KDB.elements.selectors;
    var selector = selectors && selectors.root && selectors.root.dashboardFrame;
    var frameEl = selector ? document.querySelector(selector) : null;
    if (!frameEl) return;
    var state = _KDB.state && _KDB.state.kdbControl;
    var dashboard = state && state.settings && state.settings.dashboard;
    frameEl.classList.toggle(WIDGET_CHROME_CLASS, !!(dashboard && dashboard.hideWidgetSettingsButtons === false));
  }

  function runAfterDispatch(_KDB, action, prevState, nextState, commitOptions) {
    dispatchCanvasOwnerIntent(_KDB, action, nextState);
    applyDeveloperModeAfterDispatch(_KDB, action, nextState);
    var forceApply = commitOptions && commitOptions.forceApply === true;
    if (forceApply || serializeControlPanel(prevState) !== serializeControlPanel(nextState)) {
      applyControlPanelShellVisuals(_KDB);
    }
    var isChromeAction = action && (action.type === _types.ACTION_SETTINGS_TOGGLE_DASHBOARD_CHROME ||
      action.type === _types.ACTION_SETTINGS_SET_DASHBOARD_CHROME);
    if (isChromeAction && action.payload && action.payload.key === "hideWidgetSettingsButtons") applyWidgetChromeAlwaysClass(_KDB);
  }

  function isAbortError(err) {
    return !!(err && (err.name === "AbortError" || err.code === "ABORT_ERR"));
  }

  async function revealDeveloperModeToggle(_KDB, tableData, scope) {
    var input = [{ tableName: "superuser", isCoreTable: true }];
    try {
      var waited = await tableData.waitForRows(input);
      if (scope.signal.aborted) return;
      var read = typeof tableData.readRows === "function" ? tableData.readRows(input) : null;
      var rows = Array.isArray(read) ? read : waited;
      var rt = readRuntime(_KDB);
      if (!rt || !Array.isArray(rows) || !_isRightAllowed(_readFirstRowScalar(rows))) return;
      var column = (rt.domRefs.rootEl || document).querySelector(DEVELOPER_COLUMN_SELECTOR);
      if (column) column.classList.add(DEVELOPER_COLUMN_VISIBLE_CLASS);
    } catch (err) {
      if (!isAbortError(err)) console.error("[kdbControl.revealDeveloperModeToggle] failed", err);
    }
  }

  function applyDeveloperModeToggleVisibility(_KDB) {
    var rt = readRuntime(_KDB);
    var tableData = _KDB.services && _KDB.services.tableData;
    if (!rt) return;
    var previous = rt.abortControllers.developerModeToggleVisibility;
    if (previous) previous.abort();
    var scope = new AbortController();
    rt.abortControllers.developerModeToggleVisibility = scope;
    if (tableData && typeof tableData.waitForRows === "function") revealDeveloperModeToggle(_KDB, tableData, scope);
  }

  function applyInitialEffects(_KDB) {
    applyControlPanelShellVisuals(_KDB);
    applyWidgetChromeAlwaysClass(_KDB);
    applyDeveloperModeToggleVisibility(_KDB);
  }

  function syncAuthoringClass(_KDB) {
    var rt = readRuntime(_KDB);
    var rootEl = rt && rt.domRefs.rootEl;
    if (rootEl && rootEl.classList) rootEl.classList.toggle("kdb-control--authoring", _readIsAuthoring(_KDB) === true);
  }

  function subscribeAuthoringMode(_KDB) {
    var rt = readRuntime(_KDB);
    if (!rt) return;
    function onAuthoringChanged() {
      syncAuthoringClass(_KDB);
    }
    syncAuthoringClass(_KDB);
    rt.subscriptions.authoringEntered = _KDB.events.subscribe(_authoringEvents.AUTHORING_ENTERED, onAuthoringChanged);
    rt.subscriptions.authoringExited = _KDB.events.subscribe(_authoringEvents.AUTHORING_EXITED, onAuthoringChanged);
  }

  function hasForeignSlotChild(slotEl) {
    return !!(slotEl && slotEl.querySelector(":scope > :not(.loadingIndicatorContainer)"));
  }

  function finishSaveLoadSlotLoading(_KDB) {
    var rt = readRuntime(_KDB);
    if (rt) {
      var observer = rt.observers[SLOT_RUNTIME_KEY];
      if (observer) observer.disconnect();
      delete rt.observers[SLOT_RUNTIME_KEY];
      _rt.clearTimer(rt.timers, SLOT_RUNTIME_KEY);
      delete rt.listeners[SLOT_RUNTIME_KEY];
    }
    var loading = _KDB && _KDB.services && _KDB.services.loading;
    if (loading && typeof loading.finishLoading === "function") loading.finishLoading({ mountKey: SLOT_MOUNT_KEY });
  }

  // Shows the loading indicator in the save/load slot until a foreign child (the host's own control) appears or 30 s pass.
  function startSaveLoadSlotLoading(_KDB, slotEl) {
    var rt = readRuntime(_KDB);
    if (!rt || !slotEl || slotEl.nodeType !== 1) return;
    finishSaveLoadSlotLoading(_KDB);
    var loading = _KDB.services && _KDB.services.loading;
    if (!loading || typeof loading.startLoading !== "function") return;
    var handle = loading.startLoading({ mountEl: slotEl, mountKey: SLOT_MOUNT_KEY, messageKey: "parameterSelect" });
    if (!handle) return;
    if (hasForeignSlotChild(slotEl)) {
      finishSaveLoadSlotLoading(_KDB);
      return;
    }
    var observer = new MutationObserver(function () {
      if (hasForeignSlotChild(rt.domRefs.saveLoadSlotEl)) finishSaveLoadSlotLoading(_KDB);
    });
    rt.observers[SLOT_RUNTIME_KEY] = observer;
    observer.observe(slotEl, { childList: true });
    if (hasForeignSlotChild(slotEl)) {
      finishSaveLoadSlotLoading(_KDB);
      return;
    }
    _rt.scheduleTimeout(rt.timers, SLOT_RUNTIME_KEY, function () {
      finishSaveLoadSlotLoading(_KDB);
    }, SLOT_LOADING_TIMEOUT_MS);
    rt.listeners[SLOT_RUNTIME_KEY] = function releaseSlotLoading() {
      finishSaveLoadSlotLoading(_KDB);
    };
  }

  return {
    dispatchToOwnerApi: dispatchToOwnerApi,
    syncFrameworkView: syncFrameworkView,
    runAfterDispatch: runAfterDispatch,
    applyInitialEffects: applyInitialEffects,
    subscribeAuthoringMode: subscribeAuthoringMode,
    startSaveLoadSlotLoading: startSaveLoadSlotLoading
  };
});
