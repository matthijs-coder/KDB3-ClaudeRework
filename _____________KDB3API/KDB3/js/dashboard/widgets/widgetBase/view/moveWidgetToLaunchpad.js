define(["./resolveWidgetShell.js", "./resolveLaunchpadSlotElement.js"], function (_resolveWidgetShellModule, _resolveLaunchpadSlotElement) {
  const _resolveWidgetShell = _resolveWidgetShellModule.resolveWidgetShell;
  function moveWidgetToLaunchpad(_KDB, _request) {
    const request = _request || {};
    const widgetId = request.widgetId;
    const shellEl = request.shellEl || _resolveWidgetShell(_KDB, widgetId);
    const slotEl = request.slotEl || _resolveLaunchpadSlotElement(_KDB, request.slotMeta);
    if (!widgetId || !shellEl) {
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING", errorMessage: "Widget shell is unavailable." };
    }
    if (!slotEl) {
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_LAUNCHPAD_TARGET_MISSING", errorMessage: "Launchpad slot is unavailable." };
    }
    if (shellEl.id !== widgetId) {
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_WIDGET_ID_MISSING", errorMessage: "Shell id does not match widget id." };
    }
    stripCanvasLayoutStyles(shellEl);
    try {
      slotEl.appendChild(shellEl);
    } catch (err) {
      console.error("[widgetBase.moveWidgetToLaunchpad] append failed", { widgetId: widgetId, error: err });
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED", errorMessage: "Shell append to launchpad slot threw an error." };
    }
    const postAppend = summarizePostAppend(widgetId, shellEl, slotEl);
    if (shellEl.parentNode !== slotEl) {
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED", errorMessage: "Shell append to launchpad slot failed." };
    }
    if (postAppend && postAppend.shellOwnerDocLookup === false) {
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED", errorMessage: "Shell is not findable by id in owner document after append." };
    }
    if (postAppend && postAppend.globalDocumentLookup === false) {
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED", errorMessage: "Shell is not findable by id in document after append." };
    }
    return { ok: true, widgetId: widgetId, slotKey: request.slotMeta && request.slotMeta.slotKey, shellEl: shellEl };
  }
  function stripCanvasLayoutStyles(shellEl) {
    if (!shellEl || !shellEl.style) {
      return;
    }
    shellEl.style.left = "";
    shellEl.style.top = "";
    shellEl.style.width = "";
    shellEl.style.height = "";
  }
  function summarizePostAppend(widgetId, shellEl, slotEl) {
    if (!shellEl || !slotEl) {
      return null;
    }
    const ownerDocument = slotEl.ownerDocument || shellEl.ownerDocument || null;
    return {
      shellOwnerDocLookup: ownerDocument && typeof ownerDocument.getElementById === "function" ? ownerDocument.getElementById(widgetId) === shellEl : null,
      globalDocumentLookup: typeof document !== "undefined" && typeof document.getElementById === "function" ? document.getElementById(widgetId) === shellEl : null
    };
  }
  return moveWidgetToLaunchpad;
});
