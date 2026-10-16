define([
  "../../../widgetSettings/effects/dispatchWidgetSettingsIntent.js",
  "../../../widgetSettings/config/selectors.js",
  "./domQueries.js",
  "../../../widgetSettings/view/dropdownOptionSelection.js",
  "../../../widgetSettings/view/panelOutsidePointerBehavior.js"
], function (_dispatchIntent, _settingsSelectors, _domQueries, _dropdownOptionSelection, _panelOutsidePointerBehavior) {
  "use strict";

  function onPanelPointerDown(_KDB, panelRoot, ev) {
    var option = ev.target && ev.target.closest
      ? ev.target.closest(_settingsSelectors.dropdownOptionInDropdownSelector)
      : null;
    var icon;
    var dropdown;
    if (option && panelRoot.contains(option)) {
      ev.preventDefault();
      ev.stopPropagation();
      _dropdownOptionSelection.markSelectedOption(option);
      _dispatchIntent.dropdownOption(_KDB, panelRoot, option, { isHistoryReplay: false });
      dropdown = option.closest(_settingsSelectors.dropdownSelector);
      var kind = option.getAttribute(_settingsSelectors.dropdownKindAttr) || (dropdown && dropdown.getAttribute(_settingsSelectors.dropdownKindAttr)) || "";
      if (kind !== "showValues" && kind !== "iterator" && kind !== "zoom" && kind !== "valueCaption") {
        _domQueries.hidePanelDropdowns(panelRoot);
      }
      return;
    }
    icon = ev.target && ev.target.closest
      ? ev.target.closest(_settingsSelectors.focusPanelPointerIconSelector)
      : null;
    if (!icon || !panelRoot.contains(icon)) {
      return;
    }
    dropdown = icon.querySelector(_settingsSelectors.dropdownSelector);
    if (!dropdown) {
      _dispatchIntent.icon(_KDB, panelRoot, icon, { isHistoryReplay: false });
      return;
    }
    if (ev.target.closest && ev.target.closest(_settingsSelectors.dropdownSelector) === dropdown) {
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
      if (_panelOutsidePointerBehavior.shouldKeepDropdownsOpen(panelRoot, ev.target, _settingsSelectors.focusPanelPointerIconSelector)) {
        return;
      }
      _domQueries.hidePanelDropdowns(panelRoot);
    } catch (err) {
      console.error("[widgetVis.onFocusDocumentPointerDown] failed", err);
    }
  }

  function disposeFocusPanelListeners(panelRoot, boundHandler, documentHandler) {
    try {
      panelRoot.removeEventListener("pointerdown", boundHandler, true);
    } catch (ignore) {
      /* noop */
    }
    try {
      var doc = panelRoot && panelRoot.ownerDocument ? panelRoot.ownerDocument : document;
      if (documentHandler) {
        doc.removeEventListener("pointerdown", documentHandler, true);
      }
    } catch (ignore) {
      /* noop */
    }
  }

  function bindFocusPanelInteractions(_KDB, panelRoot) {
    var boundHandler = onPanelPointerDown.bind(null, _KDB, panelRoot);
    var documentHandler = onDocumentPointerDown.bind(null, panelRoot);
    var doc = panelRoot.ownerDocument || document;
    panelRoot.addEventListener("pointerdown", boundHandler, true);
    doc.addEventListener("pointerdown", documentHandler, true);
    return disposeFocusPanelListeners.bind(null, panelRoot, boundHandler, documentHandler);
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

  function disposeSettingsButtonListener(settingsButton, boundHandler) {
    try {
      settingsButton.removeEventListener("click", boundHandler, true);
    } catch (ignore) {
      /* noop */
    }
  }

  function bindExpandHeaderSettingsButton(container, panelRoot) {
    var settingsButton = container
      ? container.querySelector("." + _settingsSelectors.toolbarClass)
      : null;
    var boundHandler;
    if (!settingsButton || !panelRoot) {
      return null;
    }
    boundHandler = onSettingsButtonClick.bind(null, panelRoot);
    settingsButton.addEventListener("click", boundHandler, true);
    return disposeSettingsButtonListener.bind(null, settingsButton, boundHandler);
  }

  return {
    bindFocusPanelInteractions: bindFocusPanelInteractions,
    bindExpandHeaderSettingsButton: bindExpandHeaderSettingsButton
  };
});
