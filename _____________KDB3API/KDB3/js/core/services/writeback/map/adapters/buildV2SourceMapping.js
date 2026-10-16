define([], function () {
  "use strict";

  function sanitizeToken(_value) {
    return String(_value).replace(/\^+/g, "").trim();
  }

  function deriveLabel(_rawKey) {
    const text = String(_rawKey);
    const segments = text.match(/\[([^\]]+)\]/g);
    if (segments && segments.length > 0) {
      let index = segments.length - 1;
      let label = segments[index].slice(1, -1);
      if (label === "Langtext" || label === "Tooltip" || / - Name$/i.test(label)) {
        if (index > 0) {
          label = segments[index - 1].slice(1, -1);
        }
      }
      return label.replace(/_flach/gi, "").trim();
    }
    return text.replace(/_flach/gi, "").replace(/\s*-\s*Name$/i, "").trim();
  }

  function removeLastBracketDot(_value) {
    return String(_value).replace(/(\.\[[^\]]+\])(?![\s\S]*\.\[[^\]]+\])/, "");
  }

  function addRev(_mapping, _seen, _kid, _original) {
    const kid = sanitizeToken(_kid);
    const original = sanitizeToken(_original);
    if (!kid || !original || _seen[kid]) {
      return;
    }
    _mapping[kid] = original;
    _seen[kid] = true;
  }

  function processFilterKey(_mapping, _seen, _rawKey, _meta) {
    const cleanKey = sanitizeToken(_rawKey);
    const label = deriveLabel(cleanKey);
    if (!label) {
      return;
    }
    addRev(_mapping, _seen, label + "_filter_KID", cleanKey);
    const values = Array.isArray(_meta && _meta.valuesArray) ? _meta.valuesArray : [];
    for (let index = 0; index < values.length; index += 1) {
      const useStr = values[index] && (values[index].u || values[index].use);
      if (!useStr) {
        continue;
      }
      const base = removeLastBracketDot(sanitizeToken(useStr));
      addRev(_mapping, _seen, label + "_filter_use_KID", base);
    }
  }

  function walkTabs(_mapping, _seen, _tabsObj) {
    if (!_tabsObj || typeof _tabsObj !== "object") {
      return;
    }
    const tabValues = Object.keys(_tabsObj).map(function (key) { return _tabsObj[key]; });
    for (let tabIndex = 0; tabIndex < tabValues.length; tabIndex += 1) {
      const arr = Array.isArray(tabValues[tabIndex].pageContextFilterObjArr)
        ? tabValues[tabIndex].pageContextFilterObjArr : [];
      for (let entryIndex = 0; entryIndex < arr.length; entryIndex += 1) {
        const entry = arr[entryIndex];
        if (!entry || typeof entry !== "object") {
          continue;
        }
        const keys = Object.keys(entry);
        if (keys.length > 0) {
          processFilterKey(_mapping, _seen, keys[0], entry[keys[0]]);
        }
      }
    }
  }

  function walkGlobalFilters(_mapping, _seen, _globalFiltersObj) {
    if (!_globalFiltersObj || typeof _globalFiltersObj !== "object") {
      return;
    }
    const tables = Object.keys(_globalFiltersObj);
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex += 1) {
      const group = _globalFiltersObj[tables[tableIndex]];
      if (!group || typeof group !== "object") {
        continue;
      }
      const filterKeys = Object.keys(group);
      for (let filterIndex = 0; filterIndex < filterKeys.length; filterIndex += 1) {
        processFilterKey(_mapping, _seen, filterKeys[filterIndex], group[filterKeys[filterIndex]]);
      }
    }
  }

  function buildV2SourceMapping(_payload, _package) {
    try {
      const mapping = {};
      const seen = {};
      const gfo = _payload && _payload.globalFiltersObj;
      if (gfo && typeof gfo === "object") {
        const topKeys = Object.keys(gfo);
        const mainName = _package && _package.datasourceName;
        const altName = _package && _package.alternativeDatasourceName;
        for (let keyIndex = 0; keyIndex < topKeys.length; keyIndex += 1) {
          const key = topKeys[keyIndex];
          if (key === mainName) {
            addRev(mapping, seen, "datasource_name_KID", key);
          }
          if (key === altName) {
            addRev(mapping, seen, "alternativeDatasource_name_KID", key);
          }
        }
        walkGlobalFilters(mapping, seen, gfo);
      }
      walkTabs(mapping, seen, _payload.tabs);
      return mapping;
    } catch (error) {
      throw error;
    }
  }

  return buildV2SourceMapping;
});
