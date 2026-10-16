define(["./resolveOwnerDocument.js"], function (_resolveOwnerDocument) {
  function resolveWidgetShell(_KDB, _widgetId, _scopeEl) {
    if (!_widgetId) {
      return null;
    }
    const scopeEl = _scopeEl || _resolveOwnerDocument(_KDB);
    if (!scopeEl || typeof scopeEl.getElementById !== "function") {
      return null;
    }
    return scopeEl.getElementById(_widgetId);
  }
  function claimShellById(_KDB, _widgetId, _options) {
    if (!_widgetId || isHostWidget(_KDB, _widgetId)) {
      return null;
    }
    const shellEl = resolveWidgetShell(_KDB, _widgetId);
    if (!shellEl) {
      return null;
    }
    if (!isEligibleWidgetShell(_KDB, shellEl, _widgetId, _options || {})) {
      return null;
    }
    return { widgetId: _widgetId, shellEl: shellEl };
  }
  function isEligibleWidgetShell(_KDB, shellEl, widgetId, options) {
    const opts = options || {};
    if (!shellEl || !widgetId) {
      return false;
    }
    if (isHostWidget(_KDB, widgetId)) {
      return false;
    }
    if (isDragSourceElement(shellEl)) {
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
  function isDragSourceElement(el) {
    if (!el || !el.classList) {
      return false;
    }
    if (el.classList.contains("jstree-anchor")) {
      return true;
    }
    if (el.closest && el.closest(".jstree")) {
      return true;
    }
    return false;
  }
  function isInLaunchpadSlot(el) {
    return !!(el && el.closest && el.closest("[data-kdb-launchpad-pad][cor_page_id][cor_page_index]"));
  }
  function isHostWidget(_KDB, widgetId) {
    if (widgetId === "kdb3widget") {
      return true;
    }
    return _KDB && _KDB.elements && _KDB.elements.kdbWidget && _KDB.elements.kdbWidget.id === widgetId;
  }
  return {
    resolveWidgetShell: resolveWidgetShell,
    claimShellById: claimShellById,
    isEligibleWidgetShell: isEligibleWidgetShell,
    isHostWidget: isHostWidget
  };
});
