define([
  "../drillthrough/install.js",
  "./domQueries.js",
  "../../widgetSettings/selectors.js"
], function (
  _drillthroughInstall,
  _domQueries,
  _widgetSettings
) {
  "use strict";

  var _settingsSelectors = _widgetSettings.domSelectors;
  var PANEL_VIS_TYPE_ATTR = "data-kdb-vis-type";
  var KEEP_DROPDOWN_OPEN_KINDS = ["showValues", "iterator", "zoom", "valueCaption"];

  function onPanelPointerDown(_KDB, panelRoot, ev) {
    var target = ev.target && ev.target.closest ? ev.target : null;
    var option = target ? target.closest(_settingsSelectors.dropdownOptionInDropdownSelector) : null;
    var icon;
    var dropdown;
    var kind;
    if (option && panelRoot.contains(option)) {
      ev.preventDefault();
      ev.stopPropagation();
      _widgetSettings.markSelectedOption(option);
      _widgetSettings.dispatchDropdownOptionIntent(_KDB, panelRoot, option, { isHistoryReplay: false });
      dropdown = option.closest(_settingsSelectors.dropdownSelector);
      kind = option.getAttribute(_settingsSelectors.dropdownKindAttr) || (dropdown && dropdown.getAttribute(_settingsSelectors.dropdownKindAttr)) || "";
      if (KEEP_DROPDOWN_OPEN_KINDS.indexOf(kind) === -1) {
        _domQueries.hidePanelDropdowns(panelRoot);
      }
      return;
    }
    icon = target ? target.closest(_settingsSelectors.focusPanelPointerIconSelector) : null;
    if (!icon || !panelRoot.contains(icon)) {
      return;
    }
    dropdown = icon.querySelector(_settingsSelectors.dropdownSelector);
    if (!dropdown) {
      _widgetSettings.dispatchIconIntent(_KDB, panelRoot, icon, { isHistoryReplay: false });
      return;
    }
    if (ev.target.closest(_settingsSelectors.dropdownSelector) === dropdown) {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    if (dropdown.classList.contains(_settingsSelectors.visibleClass)) {
      dropdown.classList.remove(_settingsSelectors.visibleClass);
    } else {
      _domQueries.hidePanelDropdowns(panelRoot);
      dropdown.classList.add(_settingsSelectors.visibleClass);
    }
  }

  function onDocumentPointerDown(panelRoot, ev) {
    try {
      if (_widgetSettings.shouldKeepDropdownsOpen(panelRoot, ev.target, _settingsSelectors.focusPanelPointerIconSelector)) {
        return;
      }
      _domQueries.hidePanelDropdowns(panelRoot);
    } catch (err) {
      console.error("[widgetVis.onFocusDocumentPointerDown] failed", err);
    }
  }

  function unbindFocusPanelListeners(panelRoot, doc, panelHandler, documentHandler) {
    panelRoot.removeEventListener("pointerdown", panelHandler, true);
    doc.removeEventListener("pointerdown", documentHandler, true);
  }

  function bindFocusPanelInteractions(_KDB, panelRoot) {
    var panelHandler = onPanelPointerDown.bind(null, _KDB, panelRoot);
    var documentHandler = onDocumentPointerDown.bind(null, panelRoot);
    var doc = panelRoot.ownerDocument || document;
    panelRoot.addEventListener("pointerdown", panelHandler, true);
    doc.addEventListener("pointerdown", documentHandler, true);
    return unbindFocusPanelListeners.bind(null, panelRoot, doc, panelHandler, documentHandler);
  }

  function onSettingsButtonClick(panelRoot, ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (panelRoot.classList.contains(_settingsSelectors.visibleClass)) {
      _domQueries.hidePanelDropdowns(panelRoot);
      panelRoot.classList.remove(_settingsSelectors.visibleClass);
    } else {
      panelRoot.classList.add(_settingsSelectors.visibleClass);
    }
  }

  function bindExpandHeaderSettingsButton(container, panelRoot) {
    var settingsButton = container ? container.querySelector("." + _settingsSelectors.toolbarClass) : null;
    var handler;
    if (!settingsButton || !panelRoot) {
      return null;
    }
    handler = onSettingsButtonClick.bind(null, panelRoot);
    settingsButton.addEventListener("click", handler, true);
    return settingsButton.removeEventListener.bind(settingsButton, "click", handler, true);
  }

  function stampFocusPanelVisType(_panelRoot, _sourcePanel) {
    var visType = _sourcePanel.getAttribute(PANEL_VIS_TYPE_ATTR);
    if (visType) {
      _panelRoot.setAttribute(PANEL_VIS_TYPE_ATTR, visType);
    } else {
      _panelRoot.removeAttribute(PANEL_VIS_TYPE_ATTR);
    }
  }

  function appendFocusUnmaximizeButton(_KDB, panelRoot) {
    var focusOnly = _widgetSettings.focusOnlyControls;
    var definition = focusOnly && focusOnly.unmaximize ? focusOnly.unmaximize : null;
    var icons = panelRoot.querySelector(_settingsSelectors.settingsIconsSelector) ||
      panelRoot.querySelector(_settingsSelectors.widgetIconsSelector);
    if (!definition || !icons || icons.querySelector("." + definition.className)) {
      return;
    }
    icons.appendChild(_widgetSettings.buildSettingsIcon(_KDB, definition));
  }

  function buildFocusPanelFromSource(sourcePanel, widgetId, _KDB) {
    var panelRoot = sourcePanel.cloneNode(true);
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
    var header = container.querySelector(_settingsSelectors.widgetHeaderSelector);
    if (!header) {
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

  function disposeFocusModeChrome(widgetId, runtime) {
    var bucket = runtime && runtime.focusMode ? runtime.focusMode : null;
    if (!bucket) {
      return { ok: true, diagnostics: { skipped: "no_focus_bucket" } };
    }
    if (typeof bucket.dispose === "function") {
      try {
        bucket.dispose();
      } catch (err) {
        console.error("[widgetVis.disposeFocusModeChrome] dispose failed", widgetId, err);
      }
    }
    bucket.focusPanelEl = null;
    bucket.dispose = null;
    bucket.observedExpanded = false;
    bucket.source = null;
    return { ok: true, diagnostics: { disposedChrome: true } };
  }

  function activateFocusModeChrome(_KDB, widgetId, runtime, options) {
    var opts = options || {};
    var bucket = runtime.focusMode;
    var sourcePanel = _domQueries.resolveCanvasSettingsPanel(widgetId);
    var container = _domQueries.resolveExpandModeContainer(widgetId);
    var panelRoot;
    var disposePanelInteractions;
    var disposeSettingsButton;
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
      _drillthroughInstall.installDrillthrough({ _KDB: _KDB, widgetId: widgetId });
      return { ok: true, diagnostics: { reusedExistingPanel: true } };
    }
    disposeFocusModeChrome(widgetId, runtime);
    panelRoot = buildFocusPanelFromSource(sourcePanel, widgetId, _KDB);
    if (!mountPanelBeforeHeader(panelRoot, container)) {
      return { ok: false, errorCode: "WIDGET_VIS_FOCUS_PANEL_FAILED", diagnostics: { mountFailed: true } };
    }
    panelRoot.classList.add(_settingsSelectors.visibleClass);
    disposePanelInteractions = bindFocusPanelInteractions(_KDB, panelRoot);
    disposeSettingsButton = bindExpandHeaderSettingsButton(container, panelRoot);
    _drillthroughInstall.installDrillthrough({ _KDB: _KDB, widgetId: widgetId });
    bucket.focusPanelEl = panelRoot;
    bucket.observedExpanded = true;
    bucket.source = opts.source || null;
    bucket.dispose = runFocusPanelDispose.bind(null, panelRoot, disposePanelInteractions, disposeSettingsButton);
    return { ok: true, diagnostics: { mounted: true, visible: true } };
  }

  return {
    activateFocusModeChrome: activateFocusModeChrome,
    disposeFocusModeChrome: disposeFocusModeChrome
  };
});
