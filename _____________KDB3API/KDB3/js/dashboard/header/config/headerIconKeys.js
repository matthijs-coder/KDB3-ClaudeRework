define([], function () {
  "use strict";

  var DEFAULT_ICON_KEY = "Stadt-wien";

  function normalizeHeaderIconStem(_raw) {
    if (_raw === undefined || _raw === null) return "";
    var stem = String(_raw).trim();
    return stem.replace(/\.png$/i, "");
  }

  function isDefaultHeaderIcon(_raw) {
    if (_raw === undefined || _raw === null) return true;
    var stem = normalizeHeaderIconStem(_raw);
    if (!stem) return true;
    var lower = stem.toLowerCase();
    return lower === "none" || lower === "default" || lower === "stadt-wien";
  }

  function readHeaderIconCatalog(_KDB) {
    var props = _KDB && _KDB.properties && _KDB.properties.headerWidgetPropObj;
    var icons = props && props.icons;
    if (!icons || typeof icons !== "object" || Array.isArray(icons)) return {};
    return icons;
  }

  function findCatalogFilenameStem(_stem, _catalog) {
    if (!_stem || !_catalog) return "";
    var needle = _stem.toLowerCase();
    var key;
    for (key in _catalog) {
      if (!Object.prototype.hasOwnProperty.call(_catalog, key)) continue;
      var valueStem = normalizeHeaderIconStem(_catalog[key]);
      if (String(key).toLowerCase() === needle) {
        return valueStem || normalizeHeaderIconStem(key);
      }
      if (valueStem && valueStem.toLowerCase() === needle) return valueStem;
    }
    return "";
  }

  function resolveHeaderIconKey(_raw, _catalog) {
    if (isDefaultHeaderIcon(_raw)) {
      return { iconKey: DEFAULT_ICON_KEY, known: true };
    }
    if (typeof _raw !== "string") {
      return { iconKey: DEFAULT_ICON_KEY, known: false };
    }
    var stem = normalizeHeaderIconStem(_raw);
    var catalogStem = findCatalogFilenameStem(stem, _catalog);
    if (catalogStem) return { iconKey: catalogStem, known: true };
    return { iconKey: DEFAULT_ICON_KEY, known: false };
  }

  return {
    DEFAULT_ICON_KEY: DEFAULT_ICON_KEY,
    normalizeHeaderIconStem: normalizeHeaderIconStem,
    isDefaultHeaderIcon: isDefaultHeaderIcon,
    resolveHeaderIconKey: resolveHeaderIconKey,
    readHeaderIconCatalog: readHeaderIconCatalog,
  };
});
