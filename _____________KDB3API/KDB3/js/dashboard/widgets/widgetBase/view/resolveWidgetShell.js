define(["../config.js"], function (_config) {
  "use strict";

  function readHostSelector(_KDB) {
    const rootSelectors = _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.root : null;
    return rootSelectors && rootSelectors.kdbWidget ? rootSelectors.kdbWidget : null;
  }

  function resolveOwnerDocument(_KDB) {
    const legacyHostEl = _KDB && _KDB.elements ? _KDB.elements.kdbWidget : null;
    if (legacyHostEl && legacyHostEl.ownerDocument) {
      return legacyHostEl.ownerDocument;
    }
    const hostSelector = readHostSelector(_KDB);
    const hostEl = hostSelector && typeof document !== "undefined" && typeof document.querySelector === "function" ? document.querySelector(hostSelector) : null;
    if (hostEl && hostEl.ownerDocument) {
      return hostEl.ownerDocument;
    }
    return typeof document !== "undefined" ? document : null;
  }

  function resolveWidgetShell(_KDB, _widgetId, _scopeEl) {
    if (!_widgetId) {
      return null;
    }
    const scopeEl = _scopeEl || resolveOwnerDocument(_KDB);
    if (!scopeEl || typeof scopeEl.getElementById !== "function") {
      return null;
    }
    return scopeEl.getElementById(_widgetId);
  }

  function isHostWidget(_KDB, widgetId) {
    if (widgetId === _config.HOST_WIDGET_ID) {
      return true;
    }
    return _KDB && _KDB.elements && _KDB.elements.kdbWidget && _KDB.elements.kdbWidget.id === widgetId;
  }

  function isDragSourceElement(el) {
    if (!el || !el.classList) {
      return false;
    }
    if (el.classList.contains("jstree-anchor")) {
      return true;
    }
    return !!(el.closest && el.closest(".jstree"));
  }

  function isInLaunchpadSlot(el) {
    return !!(el && el.closest && el.closest("[data-kdb-launchpad-pad][cor_page_id][cor_page_index]"));
  }

  function isEligibleWidgetShell(_KDB, shellEl, widgetId, options) {
    const opts = options || {};
    if (!shellEl || !widgetId) {
      return false;
    }
    if (isHostWidget(_KDB, widgetId) || isDragSourceElement(shellEl)) {
      return false;
    }
    if (opts.requireLaunchpadSlot === true && !isInLaunchpadSlot(shellEl)) {
      return false;
    }
    if (typeof opts.hasContent === "function") {
      return opts.hasContent(widgetId) === true;
    }
    return false;
  }

  function claimShellById(_KDB, _widgetId, _options) {
    if (!_widgetId || isHostWidget(_KDB, _widgetId)) {
      return null;
    }
    const shellEl = resolveWidgetShell(_KDB, _widgetId);
    if (!shellEl || !isEligibleWidgetShell(_KDB, shellEl, _widgetId, _options || {})) {
      return null;
    }
    return { widgetId: _widgetId, shellEl: shellEl };
  }

  return {
    resolveWidgetShell: resolveWidgetShell,
    claimShellById: claimShellById,
    isEligibleWidgetShell: isEligibleWidgetShell,
    isHostWidget: isHostWidget,
    resolveOwnerDocument: resolveOwnerDocument
  };
});
