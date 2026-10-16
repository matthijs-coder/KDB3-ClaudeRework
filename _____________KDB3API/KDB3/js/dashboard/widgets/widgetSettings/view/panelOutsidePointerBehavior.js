define([
  "../config/selectors.js"
], function (_selectors) {
  function disableMoveResizeModes(_KDB, panel) {
    try {
      if (isKdbEditModeEnabled(_KDB)) {
        return;
      }
      const widgetId = String(panel.getAttribute(_selectors.panelRootAttr) || "");
      const api = _KDB && _KDB.api ? _KDB.api.widgetBase : null;
      if (!widgetId || !api || typeof api.dispatch !== "function") {
        return;
      }
      api.dispatch({ type: "widgetBase/setMoveMode", widgetId: widgetId, payload: { mode: "default", source: "widgetSettings", reason: "outsidePointerDown" } });
      api.dispatch({ type: "widgetBase/resizeToggle", widgetId: widgetId, payload: { enabled: false, source: "widgetSettings", reason: "outsidePointerDown" } });
    } catch (err) {
      console.error("[widgetSettings.disableMoveResizeModes] failed", err);
    }
  }

  function isKdbEditModeEnabled(_KDB) {
    const runtime = _KDB && _KDB.runtime ? _KDB.runtime : {};
    const state = _KDB && _KDB.state ? _KDB.state : {};
    return !!(
      runtime.kdbControl && runtime.kdbControl.editMode === true ||
      runtime.kdbControl && runtime.kdbControl.kdbEditMode === true ||
      runtime.kdbEditMode === true ||
      state.kdbControl && state.kdbControl.editMode === true ||
      state.kdbEditMode === true
    );
  }

  function isInsideWidgetShell(panel, target) {
    try {
      const widgetId = String(panel.getAttribute(_selectors.panelRootAttr) || "");
      const doc = panel.ownerDocument || document;
      const shellEl = widgetId && typeof doc.getElementById === "function" ? doc.getElementById(widgetId) : null;
      return !!(shellEl && target && shellEl.contains(target));
    } catch (err) {
      console.error("[widgetSettings.isInsideWidgetShell] failed", err);
      return false;
    }
  }

  function isInsidePanelDropdown(panel, target) {
    try {
      if (!panel || !target || typeof target.closest !== "function") {
        return false;
      }
      const host = target.closest(_selectors.dropdownSelector);
      return !!(host && panel.contains(host));
    } catch (err) {
      console.error("[widgetSettings.isInsidePanelDropdown] failed", err);
      return false;
    }
  }

  function isOwningVisibleDropdownIcon(panel, target, iconSelector) {
    try {
      if (!panel || !target || typeof target.closest !== "function" || !iconSelector) {
        return false;
      }
      const icon = target.closest(iconSelector);
      if (!icon || !panel.contains(icon)) {
        return false;
      }
      const dropdown = icon.querySelector(_selectors.dropdownSelector);
      return !!(dropdown && dropdown.classList.contains(_selectors.visibleClass) && panel.contains(dropdown));
    } catch (err) {
      console.error("[widgetSettings.isOwningVisibleDropdownIcon] failed", err);
      return false;
    }
  }

  function shouldKeepDropdownsOpen(panel, target, iconSelector) {
    try {
      return isInsidePanelDropdown(panel, target) || isOwningVisibleDropdownIcon(panel, target, iconSelector);
    } catch (err) {
      console.error("[widgetSettings.shouldKeepDropdownsOpen] failed", err);
      return false;
    }
  }

  return {
    disableMoveResizeModes: disableMoveResizeModes,
    isInsideWidgetShell: isInsideWidgetShell,
    shouldKeepDropdownsOpen: shouldKeepDropdownsOpen
  };
});
