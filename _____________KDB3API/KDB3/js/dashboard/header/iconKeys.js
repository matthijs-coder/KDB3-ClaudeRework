define(["./config.js"], function (_config) {
  "use strict";

  function normalizeHeaderIconStem(_raw) {
    if (_raw === undefined || _raw === null) return "";
    return String(_raw).trim().replace(/\.png$/i, "");
  }

  function isDefaultHeaderIcon(_raw) {
    var stem = normalizeHeaderIconStem(_raw);
    if (!stem) return true;
    var lower = stem.toLowerCase();
    return lower === "none" || lower === "default" || lower === "stadt-wien";
  }

  function isSafeIconKey(_iconKey) {
    return _iconKey.trim() !== "" && !_config.ICON_KEY_UNSAFE_PATTERN.test(_iconKey);
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
      return { iconKey: _config.DEFAULT_ICON_KEY, known: true };
    }
    if (typeof _raw !== "string") {
      return { iconKey: _config.DEFAULT_ICON_KEY, known: false };
    }
    var catalogStem = findCatalogFilenameStem(normalizeHeaderIconStem(_raw), _catalog);
    if (catalogStem) return { iconKey: catalogStem, known: true };
    return { iconKey: _config.DEFAULT_ICON_KEY, known: false };
  }

  return {
    normalizeHeaderIconStem: normalizeHeaderIconStem,
    isDefaultHeaderIcon: isDefaultHeaderIcon,
    isSafeIconKey: isSafeIconKey,
    readHeaderIconCatalog: readHeaderIconCatalog,
    resolveHeaderIconKey: resolveHeaderIconKey
  };
});
