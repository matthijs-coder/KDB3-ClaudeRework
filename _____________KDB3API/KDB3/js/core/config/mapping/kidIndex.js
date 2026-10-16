define(["./parameterMap.js"], function (_parameterMap) {
  "use strict";

  // Grouped semantic index over the frozen KID map. rawKid is that map.
  // Required keys: missing values are a config error, not a silent fallback.

  const REQUIRED_KEYS = Object.freeze([
    "datasource_name_KID",
    "datasourcePrefix",
    "kennzahlenTable_KID",
    "widget_datasource_id_KID",
    "Sicht_filter_KID",
  ]);

  const DIENSTSTELLE_PREFIX = "Dienststelle";
  const INDEX = buildParameterMappingIndex(_parameterMap);

  function buildParameterMappingIndex(parameterMappingObj) {
    if (!parameterMappingObj || typeof parameterMappingObj !== "object" || Array.isArray(parameterMappingObj)) {
      return null;
    }
    const raw = parameterMappingObj;
    const index = {
      package: {
        pkg: readString(raw, "datasource_name_KID"),
        datasourceName: readString(raw, "datasource_name_KID"),
        datasourcePrefix: readString(raw, "datasourcePrefix"),
        alternativeDatasourceName: readString(raw, "alternativeDatasource_name_KID"),
        alternativeDatasourcePrefix: readString(raw, "alternativeDatasourcePrefix"),
        widgetDatasourceName: readString(raw, "widget_datasource_name_KID"),
        widgetDatasourceId: readString(raw, "widget_datasource_id_KID"),
        metricsTableKey: readString(raw, "kennzahlenTable_KID"),
      },
      filters: {},
      dienststelle: {},
      widget: { slots: {}, localFilters: {} },
      rawKid: raw,
    };

    Object.keys(raw).forEach(function (key) {
      const value = raw[key];
      if (typeof value !== "string") {
        return;
      }
      if (key.indexOf(DIENSTSTELLE_PREFIX) === 0) {
        indexDienststelleKey(index.dienststelle, key, value);
        return;
      }
      let match = key.match(/^(.+)_widget_localfilter_KID$/);
      if (match) {
        index.widget.localFilters[match[1]] = value;
        return;
      }
      match = key.match(/^(.+)_slots_KID$/);
      if (match) {
        index.widget.slots[match[1]] = value;
        return;
      }
      match = key.match(/^(.+)_filter_use_KID$/);
      if (match) {
        ensureFilterEntry(index.filters, match[1]).useBase = value;
        return;
      }
      match = key.match(/^(.+)_filter_KID$/);
      if (match) {
        ensureFilterEntry(index.filters, match[1]).itemId = value;
      }
    });

    return index;
  }

  // Dienststelle: BW/DEZPV groups; keys without an explicit group alias BW.
  function indexDienststelleKey(dienststelle, key, value) {
    let rest = key.slice(DIENSTSTELLE_PREFIX.length + 1);
    let group = "BW";
    if (rest.indexOf("BW_") === 0) {
      rest = rest.slice(3);
    } else if (rest.indexOf("DEZPV_") === 0) {
      group = "DEZPV";
      rest = rest.slice(6);
    }
    const entry = dienststelle[group] || (dienststelle[group] = { filterItemId: null, levels: {}, useBases: {} });
    if (rest === "filter_KID") {
      if (entry.filterItemId == null) {
        entry.filterItemId = value;
      }
      return;
    }
    const useMatch = rest.match(/^(.+)_filter_use_KID$/);
    if (useMatch) {
      const token = useMatch[1];
      if (/^level\d+$/.test(token)) {
        if (entry.levels[token] == null) {
          entry.levels[token] = value;
        }
      } else if (entry.useBases[token] == null) {
        entry.useBases[token] = value;
      }
    }
  }

  function ensureFilterEntry(filters, label) {
    if (!filters[label]) {
      filters[label] = { itemId: null, useBase: null };
    }
    return filters[label];
  }

  function readString(raw, key) {
    const value = raw[key];
    return typeof value === "string" && value.trim() !== "" ? value : null;
  }

  function findMissingRequiredKeys() {
    try {
      const raw = _parameterMap && typeof _parameterMap === "object" ? _parameterMap : {};
      return REQUIRED_KEYS.filter(function (key) {
        return typeof raw[key] !== "string" || raw[key].trim() === "";
      });
    } catch (error) {
      console.error("[kidIndex.findMissingRequiredKeys] failed", error);
      throw error;
    }
  }

  function getParameterMappingIndex(_KDB) {
    return INDEX;
  }

  function resolveRuntimePackageKey(_KDB) {
    try {
      const index = getParameterMappingIndex(_KDB);
      return index && index.package ? index.package.pkg : null;
    } catch (error) {
      console.error("[kidIndex.resolveRuntimePackageKey] failed", error);
      throw error;
    }
  }

  return Object.freeze({
    REQUIRED_KEYS: REQUIRED_KEYS,
    buildParameterMappingIndex: buildParameterMappingIndex,
    findMissingRequiredKeys: findMissingRequiredKeys,
    getParameterMappingIndex: getParameterMappingIndex,
    resolveRuntimePackageKey: resolveRuntimePackageKey,
  });
});
