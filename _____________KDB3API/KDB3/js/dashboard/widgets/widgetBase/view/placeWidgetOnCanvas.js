define(["./resolveWidgetShell.js", "./applyShellLayoutStyles.js"], function (_resolveWidgetShellModule, _applyShellLayoutStyles) {
  const _resolveWidgetShell = _resolveWidgetShellModule.resolveWidgetShell;
  function placeWidgetOnCanvas(_KDB, _request) {
    const request = _request || {};
    const widgetId = request.widgetId;
    const dropboxEl = resolveTargetDropboxEl(_KDB, request);
    const shellEl = request.shellEl || _resolveWidgetShell(_KDB, widgetId);
    if (!widgetId || !dropboxEl || !shellEl) {
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: "Missing widget shell or dropbox target." };
    }
    const layout = resolveCanvasLayout(_KDB, request, dropboxEl);
    _applyShellLayoutStyles(shellEl, layout);
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
      console.warn("[widgetBase.placeWidgetOnCanvas] page not mounted in tab; placing in tab container", { widgetId: request.widgetId, tabId: fallbackId, pageId: request.dropboxId });
      return resolveDropboxEl(_KDB, fallbackId);
    } catch (err) {
      console.error("[widgetBase.placeWidgetOnCanvas] page guard failed", { widgetId: request.widgetId, tabId: fallbackId, pageId: request.dropboxId }, err);
      return resolveDropboxEl(_KDB, fallbackId);
    }
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
  function resolveCanvasLayout(_KDB, request, dropboxEl) {
    if (request.layout && isNumericLayout(request.layout)) {
      return normalizeNumericLayout(request.layout);
    }
    return computeLayoutFromDrop(_KDB, request, dropboxEl);
  }
  function isNumericLayout(layout) {
    return typeof layout.x === "number" && typeof layout.y === "number";
  }
  function normalizeNumericLayout(layout) {
    return { x: Math.round(layout.x), y: Math.round(layout.y), width: Math.round(layout.width || 300), height: Math.round(layout.height || 200) };
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
  function resolveDropboxMetrics(dropboxEl) {
    if (!dropboxEl || typeof dropboxEl.getBoundingClientRect !== "function") {
      return null;
    }
    const rect = dropboxEl.getBoundingClientRect();
    return { originLeft: rect.left, originTop: rect.top, rectWidth: rect.width, rectHeight: rect.height };
  }
  function readDefaultWidth(_KDB, draggedElementType) {
    const config = readWidgetPropConfig(_KDB, draggedElementType);
    return parseDimension(config.defaultWidth, 300);
  }
  function readDefaultHeight(_KDB, draggedElementType) {
    const config = readWidgetPropConfig(_KDB, draggedElementType);
    return parseDimension(config.defaultHeight, draggedElementType === "text" ? 75 : 200);
  }
  function readWidgetPropConfig(_KDB, draggedElementType) {
    if (!_KDB || !_KDB.properties) {
      return {};
    }
    return draggedElementType === "text" ? (_KDB.properties.textWidgetPropObj || {}) : (_KDB.properties.visualizationsPropObj || {});
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
  return placeWidgetOnCanvas;
});
