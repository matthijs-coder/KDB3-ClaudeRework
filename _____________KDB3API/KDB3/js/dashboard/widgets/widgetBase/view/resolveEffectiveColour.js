define(["../../../../core/cognosHost/config/pageChromeSelectors.js"], function (_pageChrome) {
  var page = _pageChrome.page.strings;
  var dragDrop = _pageChrome.dragDrop.strings;

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
    const keys = Object.keys(colorMap);
    let index = 0;
    while (index < keys.length) {
      if (String(keys[index]).toLowerCase() === low) {
        return String(colorMap[keys[index]]);
      }
      index += 1;
    }
    if (input.charAt(0) === "#") {
      return input;
    }
    return input;
  }

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

  return resolveEffectiveColour;
});
