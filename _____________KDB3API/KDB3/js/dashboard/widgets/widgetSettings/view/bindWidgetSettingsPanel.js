define([
  "../config/selectors.js",
  "../effects/dispatchWidgetSettingsIntent.js",
  "../history/pushHistoryAfterConfirmedApply.js",
  "./queueCoupledTopNClearHistory.js",
  "./dropdownOptionSelection.js",
  "./buildDropdownSelectionFrame.js",
  "./panelDropdownUi.js",
  "./panelOutsidePointerBehavior.js"
], function (_selectors, _dispatchIntent, _pushHistoryAfterConfirmedApply, _queueCoupledTopNClearHistory, _dropdownOptionSelection, _buildSelectionFrame, _panelDropdownUi, _panelOutsidePointerBehavior) {
  function __controller(_KDB, _context) {
    try {
      const panel = _context.panelEl;
      const widgetId = String(_context.widgetId || "");
      const runtime = _KDB.runtime.widgetSettings;
      const controllerKey = "panel:" + widgetId;
      if (!panel || panel.getAttribute(_selectors.settingsBoundAttr) === "1") {
        return false;
      }
      if (runtime.abortControllers[controllerKey]) {
        runtime.abortControllers[controllerKey].abort();
      }
      clearWidgetPanelTimers(runtime, widgetId);
      runtime.abortControllers[controllerKey] = new AbortController();
      const onPointerDown = { _KDB: _KDB, handleEvent: onPanelPointerDown };
      const onClick = { _KDB: _KDB, handleEvent: onPanelClick };
      const onFocusOut = { _KDB: _KDB, handleEvent: onPanelFocusOut };
      panel.addEventListener("pointerdown", onPointerDown, { capture: true, signal: runtime.abortControllers[controllerKey].signal });
      panel.addEventListener("click", onClick, { signal: runtime.abortControllers[controllerKey].signal });
      panel.addEventListener("focusout", onFocusOut, { signal: runtime.abortControllers[controllerKey].signal });
      document.addEventListener("pointerdown", createDocumentPointerDownListener(_KDB, panel), { capture: true, signal: runtime.abortControllers[controllerKey].signal });
      panel.setAttribute(_selectors.settingsBoundAttr, "1");
      return true;
    } catch (err) {
      console.error("[widgetSettings.bindWidgetSettingsPanel] failed", { widgetId: _context && _context.widgetId }, err);
      throw err;
    }
  }

  function onPanelPointerDown(_event) {
    try {
      const _KDB = this._KDB;
      const panel = _event.currentTarget;
      const option = _panelDropdownUi.findOption(panel, _event.target);
      const icon = _panelDropdownUi.findIcon(panel, _event.target);
      let dropdown;
      let oldFrame;
      let newFrame;
      if (option) {
        _event.preventDefault();
        _event.stopPropagation();
        dropdown = option.closest(_selectors.dropdownSelector);
        oldFrame = _buildSelectionFrame(panel, dropdown);
        _dropdownOptionSelection.markSelectedOption(option);
        const intentResult = _dispatchIntent.dropdownOption(_KDB, panel, option, { isHistoryReplay: false });
        newFrame = _buildSelectionFrame(panel, dropdown);
        if (!newFrame || newFrame.kind !== "backgroundColor") {
          // B6: push pas na bevestigd apply-resultaat (geen entry bij falen/abort).
          if (!_queueCoupledTopNClearHistory(_KDB, panel, dropdown, intentResult, oldFrame, newFrame)) {
            _pushHistoryAfterConfirmedApply(_KDB, intentResult, oldFrame, newFrame);
          }
        }
        const kind = dropdown.getAttribute(_selectors.dropdownKindAttr) || "";
        if (kind !== "showValues" && kind !== "iterator" && kind !== "zoom" && kind !== "valueCaption") {
          _panelDropdownUi.closeDropdowns(panel);
        }
        return;
      }
      if (!icon) {
        return;
      }
      dropdown = icon.querySelector(_selectors.dropdownSelector);
      if (!dropdown) {
        return;
      }
      if (typeof _event.target.closest === "function" && _event.target.closest(_selectors.dropdownSelector) === dropdown) {
        return;
      }
      _event.preventDefault();
      _event.stopPropagation();
      _panelDropdownUi.toggleDropdown(panel, dropdown);
    } catch (err) {
      console.error("[widgetSettings.onPanelPointerDown] failed", err);
    }
  }

  function onPanelClick(_event) {
    try {
      const _KDB = this._KDB;
      const panel = _event.currentTarget;
      const icon = _panelDropdownUi.findIcon(panel, _event.target);
      let dropdown;
      if (!icon) {
        return;
      }
      dropdown = icon.querySelector(_selectors.dropdownSelector);
      if (dropdown) {
        return;
      }
      _panelDropdownUi.closeDropdowns(panel);
      dispatchIconAfterPointer(_KDB, panel, icon);
    } catch (err) {
      console.error("[widgetSettings.onPanelClick] failed", err);
    }
  }

  function dispatchIconAfterPointer(_KDB, panel, icon) {
    try {
      const timers = widgetSettingsTimers(_KDB);
      const key = "panelIcon:" + widgetIdFromPanel(panel);
      clearTimerKey(timers, key);
      timers[key] = window.setTimeout(runDeferredIconDispatch, 50, _KDB, panel, icon);
    } catch (err) {
      console.error("[widgetSettings.dispatchIconAfterPointer] failed", err);
      throw err;
    }
  }

  function runDeferredIconDispatch(_KDB, panel, icon) {
    try {
      _dispatchIntent.icon(_KDB, panel, icon, { isHistoryReplay: false });
    } catch (err) {
      console.error("[widgetSettings.runDeferredIconDispatch] failed", err);
    }
  }

  function createDocumentPointerDownListener(_KDB, panel) {
    try {
      return { _KDB: _KDB, panel: panel, handleEvent: onDocumentPointerDown };
    } catch (err) {
      console.error("[widgetSettings.createDocumentPointerDownListener] failed", err);
      throw err;
    }
  }

  function onDocumentPointerDown(_event) {
    try {
      const panel = this.panel;
      const target = _event.target;
      if (_panelOutsidePointerBehavior.shouldKeepDropdownsOpen(panel, target, _selectors.settingsIconChildSelector)) {
        return;
      }
      _panelDropdownUi.closeDropdowns(panel);
      if (!_panelOutsidePointerBehavior.isInsideWidgetShell(panel, target)) {
        _panelOutsidePointerBehavior.disableMoveResizeModes(this._KDB, panel);
      }
    } catch (err) {
      console.error("[widgetSettings.onDocumentPointerDown] failed", err);
    }
  }

  function onPanelFocusOut(_event) {
    try {
      const _KDB = this._KDB;
      const panel = _event.currentTarget;
      const nextFocused = _event && _event.relatedTarget ? _event.relatedTarget : null;
      if (nextFocused && panel.contains(nextFocused)) {
        return;
      }
      const timers = widgetSettingsTimers(_KDB);
      const key = "panelFocusOut:" + widgetIdFromPanel(panel);
      clearTimerKey(timers, key);
      if (panel.querySelector(".KDB_showValuesContainer.KDB_visible")) {
        return;
      }
      timers[key] = window.setTimeout(_panelDropdownUi.closeDropdowns, 0, panel);
    } catch (err) {
      console.error("[widgetSettings.onPanelFocusOut] failed", err);
    }
  }

  function widgetIdFromPanel(panel) {
    try {
      return String(panel.getAttribute(_selectors.panelRootAttr) || "");
    } catch (err) {
      console.error("[widgetSettings.widgetIdFromPanel] failed", err);
      return "";
    }
  }

  function widgetSettingsTimers(_KDB) {
    try {
      const runtime = _KDB.runtime.widgetSettings;
      runtime.timers = runtime.timers || {};
      return runtime.timers;
    } catch (err) {
      console.error("[widgetSettings.widgetSettingsTimers] failed", err);
      throw err;
    }
  }

  function clearWidgetPanelTimers(runtime, widgetId) {
    try {
      const timers = runtime && runtime.timers ? runtime.timers : {};
      clearTimerKey(timers, "panelIcon:" + widgetId);
      clearTimerKey(timers, "panelFocusOut:" + widgetId);
    } catch (err) {
      console.error("[widgetSettings.clearWidgetPanelTimers] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  function clearTimerKey(timers, key) {
    try {
      const timerId = timers[key];
      if (timerId != null) {
        window.clearTimeout(timerId);
      }
      delete timers[key];
    } catch (err) {
      console.error("[widgetSettings.clearWidgetSettingsTimer] failed", { key: key }, err);
      throw err;
    }
  }

  return __controller;
});
