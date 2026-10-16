define(["./resolveWidgetShell.js"], function (_shellModule) {
  "use strict";

  function applyShellLayoutStyles(shellEl, layout) {
    shellEl.style.left = layout.x + "px";
    shellEl.style.top = layout.y + "px";
    shellEl.style.width = layout.width + "px";
    shellEl.style.height = layout.height + "px";
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

  function applyLayoutSync(_KDB, widgetId, layout) {
    const shellEl = _shellModule.resolveWidgetShell(_KDB, widgetId);
    if (!shellEl || !layout) {
      return { ok: false, layout: layout, errorCode: "WIDGET_BASE_COGNOS_LAYOUT_FAILED", errorMessage: "Layout target unavailable." };
    }
    try {
      applyShellLayoutStyles(shellEl, layout);
      return { ok: true, layout: layout };
    } catch (err) {
      console.error("[widgetBase.applyWidgetLayout] layout effect failed", widgetId, err);
      return { ok: false, layout: layout, errorCode: "WIDGET_BASE_COGNOS_LAYOUT_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  function applyWidgetLayout(_KDB, _widgetId, _layout) {
    return Promise.resolve(applyLayoutSync(_KDB, _widgetId, _layout));
  }

  function resolveDropboxEl(_KDB, dropboxId) {
    if (_KDB && _KDB.elements && typeof _KDB.elements.dropboxById === "function" && dropboxId) {
      const registered = _KDB.elements.dropboxById(dropboxId);
      if (registered) {
        return registered;
      }
    }
    if (typeof document === "undefined" || !dropboxId) {
      return null;
    }
    const el = document.getElementById(dropboxId);
    if (!el) {
      return null;
    }
    if (el.getAttribute("kdb_dropbox") === "true") {
      return el;
    }
    if (typeof el.querySelector === "function") {
      return el.querySelector("[kdb_dropbox='true']") || el;
    }
    return el;
  }

  function resolveTargetDropboxEl(_KDB, request) {
    const fallbackId = request.fallbackDropboxId;
    if (typeof fallbackId !== "string" || fallbackId === "" || fallbackId === request.dropboxId) {
      return resolveDropboxEl(_KDB, request.dropboxId);
    }
    try {
      const hasDocument = typeof document !== "undefined";
      const pageEl = hasDocument && request.dropboxId ? document.getElementById(request.dropboxId) : null;
      const wrapperEl = hasDocument ? document.getElementById(fallbackId) : null;
      if (pageEl && wrapperEl && wrapperEl !== pageEl && wrapperEl.contains(pageEl)) {
        return resolveDropboxEl(_KDB, request.dropboxId);
      }
      console.warn(
        "[widgetBase.placeWidgetOnCanvas] page not mounted in tab; placing in tab container",
        { widgetId: request.widgetId, tabId: fallbackId, pageId: request.dropboxId }
      );
      return resolveDropboxEl(_KDB, fallbackId);
    } catch (err) {
      console.error("[widgetBase.placeWidgetOnCanvas] page guard failed", { widgetId: request.widgetId, tabId: fallbackId, pageId: request.dropboxId }, err);
      return resolveDropboxEl(_KDB, fallbackId);
    }
  }

  function parseDimension(value, fallback) {
    if (typeof value === "number" && isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  function readWidgetPropConfig(_KDB, draggedElementType) {
    if (!_KDB || !_KDB.properties) {
      return {};
    }
    return draggedElementType === "text" ? (_KDB.properties.textWidgetPropObj || {}) : (_KDB.properties.visualizationsPropObj || {});
  }

  function readDefaultWidth(_KDB, draggedElementType) {
    return parseDimension(readWidgetPropConfig(_KDB, draggedElementType).defaultWidth, 300);
  }

  function readDefaultHeight(_KDB, draggedElementType) {
    return parseDimension(readWidgetPropConfig(_KDB, draggedElementType).defaultHeight, draggedElementType === "text" ? 75 : 200);
  }

  function resolveDropboxMetrics(dropboxEl) {
    if (!dropboxEl || typeof dropboxEl.getBoundingClientRect !== "function") {
      return null;
    }
    const rect = dropboxEl.getBoundingClientRect();
    return { originLeft: rect.left, originTop: rect.top, rectWidth: rect.width, rectHeight: rect.height };
  }

  function computeLayoutFromDrop(_KDB, request, dropboxEl) {
    const dropLayout = request.dropLayout || request.layout || {};
    const pointer = dropLayout.pointer || {};
    const dragOffset = dropLayout.dragOffset || { x: 0, y: 0 };
    const scaleX = dropLayout.scaleX > 0 ? dropLayout.scaleX : 1;
    const scaleY = dropLayout.scaleY > 0 ? dropLayout.scaleY : 1;
    const width = Math.round(dropLayout.defaultWidth || readDefaultWidth(_KDB, request.draggedElementType));
    const height = Math.round(dropLayout.defaultHeight || readDefaultHeight(_KDB, request.draggedElementType));
    const metrics = resolveDropboxMetrics(dropboxEl);
    let leftPx = Math.round(((pointer.offsetX || 0) - (dragOffset.x || 0)) / scaleX);
    let topPx = Math.round(((pointer.offsetY || 0) - (dragOffset.y || 0)) / scaleY);
    if ((pointer.offsetX == null || pointer.offsetY == null) && metrics) {
      leftPx = Math.round(((pointer.clientX - metrics.originLeft) - dragOffset.x) / scaleX);
      topPx = Math.round(((pointer.clientY - metrics.originTop) - dragOffset.y) / scaleY);
    }
    if (metrics) {
      const maxLeft = Math.max(0, Math.round(metrics.rectWidth / scaleX - width));
      const maxTop = Math.max(0, Math.round(metrics.rectHeight / scaleY - height));
      leftPx = Math.min(maxLeft, Math.max(0, leftPx));
      topPx = Math.min(maxTop, Math.max(0, topPx));
    }
    return { x: Math.max(0, leftPx), y: Math.max(0, topPx), width: width, height: height };
  }

  function resolveCanvasLayout(_KDB, request, dropboxEl) {
    const layout = request.layout;
    if (layout && typeof layout.x === "number" && typeof layout.y === "number") {
      return { x: Math.round(layout.x), y: Math.round(layout.y), width: Math.round(layout.width || 300), height: Math.round(layout.height || 200) };
    }
    return computeLayoutFromDrop(_KDB, request, dropboxEl);
  }

  function placeWidgetOnCanvas(_KDB, _request) {
    const request = _request || {};
    const widgetId = request.widgetId;
    const dropboxEl = resolveTargetDropboxEl(_KDB, request);
    const shellEl = request.shellEl || _shellModule.resolveWidgetShell(_KDB, widgetId);
    if (!widgetId || !dropboxEl || !shellEl) {
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: "Missing widget shell or dropbox target." };
    }
    const layout = resolveCanvasLayout(_KDB, request, dropboxEl);
    applyShellLayoutStyles(shellEl, layout);
    try {
      dropboxEl.appendChild(shellEl);
    } catch (err) {
      console.error("[widgetBase.placeWidgetOnCanvas] shell append failed", widgetId, err);
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: "Shell append to dropbox failed." };
    }
    if (shellEl.parentNode !== dropboxEl) {
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: "Shell append to dropbox failed." };
    }
    return { ok: true, widgetId: widgetId, layout: layout, shellEl: shellEl };
  }

  function buildSlotSelector(slotMeta) {
    const pageIndex = slotMeta && slotMeta.pageIndex != null ? slotMeta.pageIndex : slotMeta && slotMeta.childIndex;
    if (!slotMeta || !slotMeta.padKey || !slotMeta.tabId || pageIndex == null) {
      return null;
    }
    const escape = function (value) { return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); };
    return '[data-kdb-launchpad-pad="' + escape(slotMeta.padKey) + '"][cor_page_id="' + escape(slotMeta.tabId) + '"][cor_page_index="' + escape(String(pageIndex)) + '"]';
  }

  function resolveLaunchpadRoot(_KDB) {
    const selectorConfig = _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.launchpad : null;
    const hideSpotSelector = selectorConfig && selectorConfig.hideSpotSelector;
    const rootSelector = selectorConfig && selectorConfig.rootSelector;
    const ownerDocument = _shellModule.resolveOwnerDocument(_KDB);
    if (!ownerDocument || typeof ownerDocument.querySelector !== "function") {
      return null;
    }
    if (hideSpotSelector) {
      const hideSpotEl = ownerDocument.querySelector(hideSpotSelector);
      if (hideSpotEl && rootSelector && typeof hideSpotEl.querySelector === "function") {
        return hideSpotEl.querySelector(rootSelector) || hideSpotEl;
      }
    }
    return rootSelector ? ownerDocument.querySelector(rootSelector) : null;
  }

  function resolveLaunchpadSlotElement(_KDB, _slotMeta) {
    const slotSelector = buildSlotSelector(_slotMeta || {});
    if (!slotSelector) {
      return null;
    }
    const rootEl = resolveLaunchpadRoot(_KDB);
    if (!rootEl || typeof rootEl.querySelector !== "function") {
      return null;
    }
    return rootEl.querySelector(slotSelector);
  }

  function summarizePostAppend(widgetId, shellEl, slotEl) {
    const ownerDocument = slotEl.ownerDocument || shellEl.ownerDocument || null;
    return {
      shellOwnerDocLookup: ownerDocument && typeof ownerDocument.getElementById === "function" ? ownerDocument.getElementById(widgetId) === shellEl : null,
      globalDocumentLookup: typeof document !== "undefined" && typeof document.getElementById === "function" ? document.getElementById(widgetId) === shellEl : null
    };
  }

  function moveFailure(widgetId, errorCode, errorMessage) {
    return { ok: false, widgetId: widgetId, errorCode: errorCode, errorMessage: errorMessage };
  }

  function moveWidgetToLaunchpad(_KDB, _request) {
    const request = _request || {};
    const widgetId = request.widgetId;
    const shellEl = request.shellEl || _shellModule.resolveWidgetShell(_KDB, widgetId);
    const slotEl = request.slotEl || resolveLaunchpadSlotElement(_KDB, request.slotMeta);
    if (!widgetId || !shellEl) {
      return moveFailure(widgetId, "WIDGET_BASE_WIDGET_ID_MISSING", "Widget shell is unavailable.");
    }
    if (!slotEl) {
      return moveFailure(widgetId, "WIDGET_BASE_LAUNCHPAD_TARGET_MISSING", "Launchpad slot is unavailable.");
    }
    if (shellEl.id !== widgetId) {
      return moveFailure(widgetId, "WIDGET_BASE_WIDGET_ID_MISSING", "Shell id does not match widget id.");
    }
    stripCanvasLayoutStyles(shellEl);
    try {
      slotEl.appendChild(shellEl);
    } catch (err) {
      console.error("[widgetBase.moveWidgetToLaunchpad] append failed", { widgetId: widgetId, error: err });
      return moveFailure(widgetId, "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED", "Shell append to launchpad slot threw an error.");
    }
    const postAppend = summarizePostAppend(widgetId, shellEl, slotEl);
    if (shellEl.parentNode !== slotEl) {
      return moveFailure(widgetId, "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED", "Shell append to launchpad slot failed.");
    }
    if (postAppend.shellOwnerDocLookup === false) {
      return moveFailure(widgetId, "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED", "Shell is not findable by id in owner document after append.");
    }
    if (postAppend.globalDocumentLookup === false) {
      return moveFailure(widgetId, "WIDGET_BASE_LAUNCHPAD_APPEND_FAILED", "Shell is not findable by id in document after append.");
    }
    return { ok: true, widgetId: widgetId, slotKey: request.slotMeta && request.slotMeta.slotKey, shellEl: shellEl };
  }

  return {
    placeWidgetOnCanvas: placeWidgetOnCanvas,
    moveWidgetToLaunchpad: moveWidgetToLaunchpad,
    applyWidgetLayout: applyWidgetLayout
  };
});
