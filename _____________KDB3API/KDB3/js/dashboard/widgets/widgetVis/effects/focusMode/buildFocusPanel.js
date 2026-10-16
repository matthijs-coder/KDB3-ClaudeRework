define([
  "../../../widgetSettings/config/selectors.js",
  "../../../widgetSettings/config/controlDefinitions.js",
  "../../../widgetSettings/view/buildSettingsIcon.js",
  "./domQueries.js",
  "./bindFocusPanelInteractions.js",
  "./disposeFocusMode.js",
  "../installAllDrillthrough.js"
], function (_settingsSelectors, _controlDefinitions, _buildSettingsIcon, _domQueries, _bindFocusPanelInteractions, _disposeFocusMode, _installDrillthrough) {
  "use strict";

  var PANEL_VIS_TYPE_ATTR = "data-kdb-vis-type";

  function stampFocusPanelVisType(_panelRoot, _sourcePanel) {
    try {
      var visType;
      if (!_panelRoot) {
        return;
      }
      visType = _sourcePanel ? _sourcePanel.getAttribute(PANEL_VIS_TYPE_ATTR) : "";
      if (visType) {
        _panelRoot.setAttribute(PANEL_VIS_TYPE_ATTR, visType);
      } else {
        _panelRoot.removeAttribute(PANEL_VIS_TYPE_ATTR);
      }
    } catch (err) {
      console.error("[widgetVis.buildFocusPanel] stamp vis type failed", err);
    }
  }

  function appendFocusUnmaximizeButton(_KDB, panelRoot) {
    var focusOnly = _controlDefinitions.focusOnly;
    var definition = focusOnly && focusOnly.unmaximize ? focusOnly.unmaximize : null;
    var icons = panelRoot.querySelector(_settingsSelectors.settingsIconsSelector) ||
      panelRoot.querySelector(_settingsSelectors.widgetIconsSelector);
    if (!definition || !icons) {
      return;
    }
    if (icons.querySelector("." + definition.className)) {
      return;
    }
    icons.appendChild(_buildSettingsIcon(_KDB, definition));
  }

  function buildFocusPanelFromSource(sourcePanel, widgetId, _KDB) {
    var panelRoot;
    if (!sourcePanel) {
      return null;
    }
    panelRoot = sourcePanel.cloneNode(true);
    panelRoot.classList.remove(_settingsSelectors.visibleClass);
    panelRoot.classList.add("KDB_focusModeSettingsPanel");
    panelRoot.setAttribute(_settingsSelectors.focusPanelRootAttr, String(widgetId));
    panelRoot.removeAttribute(_settingsSelectors.panelRootAttr);
    stampFocusPanelVisType(panelRoot, sourcePanel);
    _domQueries.filterFocusPanelIcons(panelRoot);
    appendFocusUnmaximizeButton(_KDB, panelRoot);
    _domQueries.hidePanelDropdowns(panelRoot);
    return panelRoot;
  }

  function mountPanelBeforeHeader(panelRoot, container) {
    var header = container ? container.querySelector(_settingsSelectors.widgetHeaderSelector) : null;
    if (!panelRoot || !container || !header) {
      return false;
    }
    header.insertAdjacentElement("beforebegin", panelRoot);
    return true;
  }

  function runFocusPanelDispose(panelRoot, disposePanelInteractions, disposeSettingsButton) {
    _domQueries.hidePanelDropdowns(panelRoot);
    panelRoot.classList.remove(_settingsSelectors.visibleClass);
    if (typeof disposePanelInteractions === "function") {
      disposePanelInteractions();
    }
    if (typeof disposeSettingsButton === "function") {
      disposeSettingsButton();
    }
    if (panelRoot.parentNode) {
      panelRoot.parentNode.removeChild(panelRoot);
    }
  }

  function runExpandDrillthroughInstall(_KDB, _widgetId) {
    try {
      _installDrillthrough({ _KDB: _KDB, widgetId: _widgetId });
    } catch (err) {
      console.error("[widgetVis.buildFocusPanel] drillthrough install failed", _widgetId, err);
    }
  }

  function activateFocusModeChrome(_KDB, widgetId, runtime, options) {
    var opts = options || {};
    var bucket = runtime.focusMode;
    var sourcePanel = _domQueries.resolveCanvasSettingsPanel(widgetId);
    var container = _domQueries.resolveExpandModeContainer(widgetId);
    var panelRoot;
    var disposePanelInteractions;
    var disposeSettingsButton;
    var diagnostics = {};
    if (!sourcePanel || !container) {
      return {
        ok: false,
        errorCode: "WIDGET_VIS_FOCUS_PANEL_FAILED",
        diagnostics: { missingSourcePanel: !sourcePanel, missingContainer: !container }
      };
    }
    if (bucket.focusPanelEl && bucket.focusPanelEl.parentNode) {
      stampFocusPanelVisType(bucket.focusPanelEl, sourcePanel);
      bucket.focusPanelEl.classList.add(_settingsSelectors.visibleClass);
      bucket.observedExpanded = true;
      bucket.source = opts.source || bucket.source || null;
      runExpandDrillthroughInstall(_KDB, widgetId);
      return { ok: true, diagnostics: { reusedExistingPanel: true } };
    }
    _disposeFocusMode.disposeFocusModeChrome(widgetId, runtime);
    panelRoot = buildFocusPanelFromSource(sourcePanel, widgetId, _KDB);
    if (!panelRoot || !mountPanelBeforeHeader(panelRoot, container)) {
      return {
        ok: false,
        errorCode: "WIDGET_VIS_FOCUS_PANEL_FAILED",
        diagnostics: { mountFailed: true }
      };
    }
    panelRoot.classList.add(_settingsSelectors.visibleClass);
    disposePanelInteractions = _bindFocusPanelInteractions.bindFocusPanelInteractions(_KDB, panelRoot);
    disposeSettingsButton = _bindFocusPanelInteractions.bindExpandHeaderSettingsButton(container, panelRoot);
    runExpandDrillthroughInstall(_KDB, widgetId);
    bucket.focusPanelEl = panelRoot;
    bucket.observedExpanded = true;
    bucket.source = opts.source || null;
    bucket.dispose = runFocusPanelDispose.bind(null, panelRoot, disposePanelInteractions, disposeSettingsButton);
    diagnostics.mounted = true;
    diagnostics.visible = true;
    return { ok: true, diagnostics: diagnostics };
  }

  return activateFocusModeChrome;
});
