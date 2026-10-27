define([
  "../../../../core/utils/kit/runtime.js",
  "../config/selectors.js",
  "../effects/dispatchWidgetSettingsIntent.js",
  "../history.js",
  "./dropdownUi.js",
  "./panelOutsidePointerBehavior.js"
], function (
  _kitRuntime,
  _selectors,
  _dispatchIntent,
  _history,
  _dropdownUi,
  _panelOutsidePointerBehavior
) {
  const ICON_DISPATCH_DELAY_MS = 50;
  const KEEP_OPEN_KINDS = ["showValues", "iterator", "zoom", "valueCaption"];

  function readPanelWidgetId(panel) {
    return String(panel.getAttribute(_selectors.panelRootAttr) || "");
  }

  function selectOption(_KDB, panel, option) {
    _history.selectDropdownOption(_KDB, panel, option);
    const dropdown = option.closest(_selectors.dropdownSelector);
    if (KEEP_OPEN_KINDS.indexOf((dropdown && dropdown.getAttribute(_selectors.dropdownKindAttr)) || "") < 0) {
      _dropdownUi.closeDropdowns(panel);
    }
  }

  function onPanelPointerDown(_KDB, event) {
    try {
      const panel = event.currentTarget;
      const option = _dropdownUi.findOption(panel, event.target);
      if (option) {
        event.preventDefault();
        event.stopPropagation();
        selectOption(_KDB, panel, option);
        return;
      }
      const icon = _dropdownUi.findIcon(panel, event.target);
      const dropdown = icon ? icon.querySelector(_selectors.dropdownSelector) : null;
      if (!dropdown) {
        return;
      }
      if (typeof event.target.closest === "function" && event.target.closest(_selectors.dropdownSelector) === dropdown) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      _dropdownUi.toggleDropdown(panel, dropdown);
    } catch (err) {
      console.error("[widgetSettings.onPanelPointerDown] failed", err);
    }
  }

  function runDeferredIconDispatch(_KDB, panel, icon) {
    try {
      _dispatchIntent.icon(_KDB, panel, icon, { isHistoryReplay: false });
    } catch (err) {
      console.error("[widgetSettings.runDeferredIconDispatch] failed", err);
    }
  }

  function onPanelClick(_KDB, event) {
    try {
      const panel = event.currentTarget;
      const icon = _dropdownUi.findIcon(panel, event.target);
      if (!icon || icon.querySelector(_selectors.dropdownSelector)) {
        return;
      }
      _dropdownUi.closeDropdowns(panel);
      _kitRuntime.scheduleTimeout(_KDB.runtime.widgetSettings.timers, "panelIcon:" + readPanelWidgetId(panel), function () {
        runDeferredIconDispatch(_KDB, panel, icon);
      }, ICON_DISPATCH_DELAY_MS);
    } catch (err) {
      console.error("[widgetSettings.onPanelClick] failed", err);
    }
  }

  function onPanelFocusOut(_KDB, event) {
    try {
      const panel = event.currentTarget;
      const nextFocused = event.relatedTarget || null;
      if (nextFocused && panel.contains(nextFocused)) {
        return;
      }
      const timers = _KDB.runtime.widgetSettings.timers;
      const key = "panelFocusOut:" + readPanelWidgetId(panel);
      _kitRuntime.clearTimer(timers, key);
      if (panel.querySelector(".KDB_showValuesContainer.KDB_visible")) {
        return;
      }
      _kitRuntime.scheduleTimeout(timers, key, function () {
        _dropdownUi.closeDropdowns(panel);
      }, 0);
    } catch (err) {
      console.error("[widgetSettings.onPanelFocusOut] failed", err);
    }
  }

  function bindWidgetSettingsPanel(_KDB, context) {
    const panel = context.panelEl;
    const widgetId = String(context.widgetId || "");
    const runtime = _KDB.runtime.widgetSettings;
    const controllerKey = "panel:" + widgetId;
    if (!panel || panel.getAttribute(_selectors.settingsBoundAttr) === "1") {
      return false;
    }
    if (runtime.abortControllers[controllerKey]) {
      runtime.abortControllers[controllerKey].abort();
    }
    _kitRuntime.clearTimer(runtime.timers, "panelIcon:" + widgetId);
    _kitRuntime.clearTimer(runtime.timers, "panelFocusOut:" + widgetId);
    const controller = new AbortController();
    runtime.abortControllers[controllerKey] = controller;
    panel.addEventListener("pointerdown", function (event) { onPanelPointerDown(_KDB, event); }, { capture: true, signal: controller.signal });
    panel.addEventListener("click", function (event) { onPanelClick(_KDB, event); }, { signal: controller.signal });
    panel.addEventListener("focusout", function (event) { onPanelFocusOut(_KDB, event); }, { signal: controller.signal });
    panel.setAttribute(_selectors.settingsBoundAttr, "1");
    _panelOutsidePointerBehavior.ensureDocumentPointerDown(_KDB);
    return true;
  }

  return {
    bindWidgetSettingsPanel: bindWidgetSettingsPanel
  };
});
