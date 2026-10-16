define([], function () {
  function readWidgetLayoutFromDom(_KDB, shellEl) {
    try {
      if (!shellEl) {
        return null;
      }
      const x = readCssLength(_KDB, shellEl.style ? shellEl.style.left : null, shellEl.offsetLeft);
      const y = readCssLength(_KDB, shellEl.style ? shellEl.style.top : null, shellEl.offsetTop);
      let width = readCssLength(_KDB, shellEl.style ? shellEl.style.width : null, null);
      let height = readCssLength(_KDB, shellEl.style ? shellEl.style.height : null, null);
      if ((!width || width <= 0 || !height || height <= 0) && typeof shellEl.getBoundingClientRect === "function") {
        const rect = shellEl.getBoundingClientRect();
        if ((!width || width <= 0) && rect && isFinite(rect.width)) {
          width = Math.round(rect.width);
        }
        if ((!height || height <= 0) && rect && isFinite(rect.height)) {
          height = Math.round(rect.height);
        }
      }
      return {
        x: isFinite(x) ? Math.round(x) : 0,
        y: isFinite(y) ? Math.round(y) : 0,
        width: isFinite(width) && width > 0 ? Math.round(width) : 300,
        height: isFinite(height) && height > 0 ? Math.round(height) : 200
      };
    } catch (err) {
      console.error("[widgetBase.readWidgetLayoutFromDom] layout read failed", err);
      return { x: 0, y: 0, width: 300, height: 200 };
    }
  }

  function readCssLength(_KDB, value, fallback) {
    const parsed = parseCssLengthToPx(_KDB, value);
    if (parsed !== null) {
      return parsed;
    }
    return isFinite(fallback) ? Math.round(fallback) : null;
  }

  function parseCssLengthToPx(_KDB, value) {
    let n;
    if (typeof value === "number" && isFinite(value)) {
      return Math.round(value);
    }
    if (typeof value !== "string") {
      return null;
    }
    value = String(value || "").trim();
    if (value === "") {
      return null;
    }
    if (/^-?\d+(\.\d+)?$/i.test(value) || /^-?\d+(\.\d+)?px$/i.test(value)) {
      n = parseFloat(value);
      return isFinite(n) ? Math.round(n) : null;
    }
    if (_KDB && _KDB.utilities && typeof _KDB.utilities.convertToPx === "function") {
      try {
        n = parseFloat(String(_KDB.utilities.convertToPx(value) || "").trim());
        return isFinite(n) ? Math.round(n) : null;
      } catch (_err) {
        return null;
      }
    }
    return null;
  }

  return readWidgetLayoutFromDom;
});
