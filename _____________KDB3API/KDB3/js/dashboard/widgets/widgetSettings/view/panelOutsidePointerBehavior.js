define([
  "../../../../core/utils/kit/runtime.js",
  "../config/selectors.js",
  "./dropdownUi.js"
], function (_kitRuntime, _selectors, _dropdownUi) {
  const LISTENER_KEY = "documentPointerDown";
  const LISTENER_OPTIONS = { capture: true };

  function readPanelWidgetId(panel) {
    return String(panel.getAttribute(_selectors.panelRootAttr) || "");
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

  function disableMoveResizeModes(_KDB, panel) {
    if (isKdbEditModeEnabled(_KDB)) {
      return;
    }
    const widgetId = readPanelWidgetId(panel);
    const api = _KDB && _KDB.api ? _KDB.api.widgetBase : null;
    if (!widgetId || !api || typeof api.dispatch !== "function") {
      return;
    }
    api.dispatch({ type: "widgetBase/setMoveMode", widgetId: widgetId, payload: { mode: "default", source: "widgetSettings", reason: "outsidePointerDown" } });
    api.dispatch({ type: "widgetBase/resizeToggle", widgetId: widgetId, payload: { enabled: false, source: "widgetSettings", reason: "outsidePointerDown" } });
  }

  function isInsideWidgetShell(panel, target) {
    const widgetId = readPanelWidgetId(panel);
    const doc = panel.ownerDocument || document;
    const shellEl = widgetId && typeof doc.getElementById === "function" ? doc.getElementById(widgetId) : null;
    return !!(shellEl && target && shellEl.contains(target));
  }

  function isInsidePanelDropdown(panel, target) {
    if (!panel || !target || typeof target.closest !== "function") {
      return false;
    }
    const host = target.closest(_selectors.dropdownSelector);
    return !!(host && panel.contains(host));
  }

  function isOwningVisibleDropdownIcon(panel, target, iconSelector) {
    if (!panel || !target || typeof target.closest !== "function" || !iconSelector) {
      return false;
    }
    const icon = target.closest(iconSelector);
    if (!icon || !panel.contains(icon)) {
      return false;
    }
    const dropdown = icon.querySelector(_selectors.dropdownSelector);
    return !!(dropdown && dropdown.classList.contains(_selectors.visibleClass) && panel.contains(dropdown));
  }

  function shouldKeepDropdownsOpen(panel, target, iconSelector) {
    return isInsidePanelDropdown(panel, target) || isOwningVisibleDropdownIcon(panel, target, iconSelector);
  }

  function listBoundPanels(_KDB) {
    const rt = _KDB.runtime && _KDB.runtime.widgetSettings;
    const domRefs = rt && rt.domRefs ? rt.domRefs : {};
    return Object.keys(domRefs).map(function (widgetId) {
      return domRefs[widgetId] && domRefs[widgetId].panel;
    }).filter(function (panel) {
      return !!panel && panel.getAttribute(_selectors.settingsBoundAttr) === "1";
    });
  }

  function handlePanelOutsidePointer(_KDB, panel, target) {
    if (shouldKeepDropdownsOpen(panel, target, _selectors.settingsIconChildSelector)) {
      return;
    }
    _dropdownUi.closeDropdowns(panel);
    if (!isInsideWidgetShell(panel, target)) {
      disableMoveResizeModes(_KDB, panel);
    }
  }

  function onDocumentPointerDown(_KDB, event) {
    listBoundPanels(_KDB).forEach(function (panel) {
      try {
        handlePanelOutsidePointer(_KDB, panel, event.target);
      } catch (err) {
        console.error("[widgetSettings.onDocumentPointerDown] failed", err);
      }
    });
  }

  function ensureDocumentPointerDown(_KDB) {
    const rt = _KDB.runtime.widgetSettings;
    rt.listeners = rt.listeners || {};
    if (rt.listeners[LISTENER_KEY]) {
      return;
    }
    _kitRuntime.addListener(rt.listeners, LISTENER_KEY, document, "pointerdown", function (event) {
      onDocumentPointerDown(_KDB, event);
    }, LISTENER_OPTIONS);
  }

  function releaseDocumentPointerDownIfIdle(_KDB) {
    const rt = _KDB.runtime && _KDB.runtime.widgetSettings;
    const record = rt && rt.listeners ? rt.listeners[LISTENER_KEY] : null;
    if (!record || listBoundPanels(_KDB).length > 0) {
      return;
    }
    record.target.removeEventListener(record.type, record.handler, record.options);
    delete rt.listeners[LISTENER_KEY];
  }

  return {
    disableMoveResizeModes: disableMoveResizeModes,
    isInsideWidgetShell: isInsideWidgetShell,
    shouldKeepDropdownsOpen: shouldKeepDropdownsOpen,
    ensureDocumentPointerDown: ensureDocumentPointerDown,
    releaseDocumentPointerDownIfIdle: releaseDocumentPointerDownIfIdle
  };
});
