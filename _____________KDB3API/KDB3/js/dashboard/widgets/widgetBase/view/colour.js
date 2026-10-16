define([
  "../../../../core/cognosHost/config/pageChromeSelectors.js",
  "../../../../core/cognosHost/config/widgetChromeSelectors.js",
  "./resolveWidgetShell.js"
], function (_pageChrome, _widgetChrome, _shellModule) {
  "use strict";

  const page = _pageChrome.page.strings;
  const dragDrop = _pageChrome.dragDrop.strings;
  const widget = _widgetChrome.widget.strings;

  function resolveDefaultColour(_KDB) {
    const defaults = _KDB && _KDB.config && _KDB.config.options && _KDB.config.options.defaults;
    if (defaults && defaults.backgroundColor) {
      return String(defaults.backgroundColor);
    }
    return "#ffffff";
  }

  function readColorMap(_KDB) {
    const runtimeColor = _KDB && _KDB.config && _KDB.config.options && _KDB.config.options.color;
    return runtimeColor && typeof runtimeColor === "object" ? runtimeColor : {};
  }

  function readPageBackgroundColour(shellEl) {
    const doc = shellEl && shellEl.ownerDocument ? shellEl.ownerDocument : (typeof document !== "undefined" ? document : null);
    const pageEl = (shellEl && typeof shellEl.closest === "function" && shellEl.closest(page.exactPageRootSelector))
      || (doc && typeof doc.querySelector === "function" ? doc.querySelector(dragDrop.canvasDropboxSelector) : null)
      || (doc ? doc.body : null);
    let cssCol = "";
    if (pageEl && typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
      cssCol = String(window.getComputedStyle(pageEl).backgroundColor || "").trim();
    }
    if (!cssCol || cssCol === "rgba(0, 0, 0, 0)" || cssCol === "transparent") {
      return "#ffffff";
    }
    return cssCol;
  }

  function resolveEffectiveColour(_KDB, rawValue, shellEl) {
    const input = String(rawValue == null ? "" : rawValue).trim();
    const low = input.toLowerCase();
    if (!input) {
      return "";
    }
    if (low === "default" || low === "#default") {
      return resolveDefaultColour(_KDB);
    }
    if (low === "none" || low === "#none") {
      return readPageBackgroundColour(shellEl);
    }
    const colorMap = readColorMap(_KDB);
    if (colorMap[low]) {
      return String(colorMap[low]);
    }
    const matchingKey = Object.keys(colorMap).find(function (key) { return String(key).toLowerCase() === low; });
    return matchingKey !== undefined ? String(colorMap[matchingKey]) : input;
  }

  function isTextWidget(widgetType, shellEl) {
    const type = String(widgetType || "").toLowerCase();
    if (type === "text") {
      return true;
    }
    if (type === "live" || type === "vis" || type === "visualization") {
      return false;
    }
    return shellEl && typeof shellEl.querySelector === "function" && !!shellEl.querySelector(widget.staticContentSelector);
  }

  function findFillCustomColorClass(element) {
    if (!element || !element.classList) {
      return null;
    }
    return Array.from(element.classList).find(function (name) { return name.indexOf("fill-customColor") === 0; }) || null;
  }

  function syncTextHeaderColourClass(shellEl) {
    const widgetHeader = shellEl.querySelector(widget.widgetHeaderSelector);
    const textArea = shellEl.querySelector(widget.staticContentSelector);
    if (!widgetHeader || !textArea) {
      return;
    }
    const oldColorClass = findFillCustomColorClass(widgetHeader);
    const newColorClass = findFillCustomColorClass(textArea);
    if (oldColorClass) {
      widgetHeader.classList.remove(oldColorClass);
    }
    if (newColorClass) {
      widgetHeader.classList.add(newColorClass);
    }
  }

  function applyColourSync(_KDB, widgetId, input) {
    const optionValue = input.optionValue != null ? input.optionValue : input.toColour;
    const shellEl = _shellModule.resolveWidgetShell(_KDB, widgetId);
    if (!shellEl) {
      return { ok: false, colour: optionValue, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: "Widget shell unavailable for colour update." };
    }
    const effectiveColour = resolveEffectiveColour(_KDB, optionValue, shellEl);
    if (!effectiveColour) {
      return { ok: false, colour: optionValue, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: "Colour value could not be resolved." };
    }
    try {
      shellEl.style.backgroundColor = effectiveColour;
      if (isTextWidget(input.widgetType, shellEl)) {
        syncTextHeaderColourClass(shellEl);
      }
      return { ok: true, colour: effectiveColour };
    } catch (err) {
      console.error("[widgetBase.applyWidgetColour] colour effect failed", widgetId, err);
      return { ok: false, colour: effectiveColour, errorCode: "WIDGET_BASE_DROP_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  function applyWidgetColour(_KDB, _widgetId, _input) {
    return Promise.resolve(applyColourSync(_KDB, _widgetId, _input || {}));
  }

  return { applyWidgetColour: applyWidgetColour };
});
