define([
  "./config.js",
  "../../tabs/state/selectors.js",
  "../../../core/utils/getKennzahlenSource.js",
  "../../../core/utils/kit/data.js"
], function (_config, _tabsSelectors, _getKennzahlenSource, _data) {
  "use strict";

  function isTrueish(value) {
    return value === true || value === "true" || value === "trueish";
  }

  function readNormalizedString(value) {
    return value == null ? "" : String(value).trim();
  }

  function readFilterLabel(filterEl, selectors) {
    var labelSelector = selectors && selectors.filterLabelSelector;
    var labelEl = labelSelector && filterEl ? filterEl.querySelector(labelSelector) : null;
    var attr = selectors && selectors.filterDataIdAttr;
    return labelEl && attr ? String(labelEl.getAttribute(attr) || "").trim() : "";
  }

  function readScopeType(filterEl, selectors) {
    return filterEl.closest(selectors.globalDockSelector) ? "global" : "pageContext";
  }

  function readActiveTabId(_KDB) {
    var selectorValue = _tabsSelectors && _tabsSelectors.readActiveTabId
      ? _tabsSelectors.readActiveTabId(_KDB)
      : null;
    return selectorValue == null ? "" : String(selectorValue).trim();
  }

  function readCompatActiveTabId(_KDB) {
    var tab;
    if (!(_KDB && _KDB.utils && typeof _KDB.utils.readCurrentTab === "function")) {
      return "";
    }
    tab = _KDB.utils.readCurrentTab();
    return tab && tab.id ? String(tab.id).trim() : "";
  }

  function buildTabScopeContext(tabId, diagnostic) {
    return {
      tabId: tabId,
      scopeId: null,
      scopeResolution: "ownerRequired",
      legacyScope: tabId,
      legacyScopeId: tabId,
      tabContextDiagnostic: diagnostic
    };
  }

  function readScopeContext(_KDB, scopeType) {
    var tabId;
    if (scopeType === "global") {
      return {
        tabId: null,
        scopeId: "global",
        scopeResolution: "global",
        legacyScope: "global",
        legacyScopeId: "global",
        tabContextDiagnostic: null
      };
    }
    tabId = readActiveTabId(_KDB);
    if (tabId) {
      return buildTabScopeContext(tabId, null);
    }
    tabId = readCompatActiveTabId(_KDB);
    if (tabId) {
      return buildTabScopeContext(tabId, "FILTER_DOCK_TAB_CONTEXT_DEGRADED");
    }
    return {
      tabId: null,
      scopeId: null,
      scopeResolution: "ownerRequired",
      legacyScope: "unknown",
      legacyScopeId: "unknown",
      tabContextDiagnostic: "FILTER_DOCK_TAB_CONTEXT_MISSING"
    };
  }

  function readRuntimeScope(_KDB, scopeType) {
    if (scopeType === "global") {
      return "global";
    }
    return readScopeContext(_KDB, scopeType).tabId || "pageContext";
  }

  function readFilterConfig(_KDB, filterLabel, filterScope, kennzahlenSource) {
    var filterPropObj = _KDB && _KDB.properties && _KDB.properties.filterPropObj;
    var source = kennzahlenSource || _getKennzahlenSource(_KDB);
    var sourceConfig = filterPropObj && source ? filterPropObj[source] : null;
    var scopeFilters;
    if (!sourceConfig) {
      return null;
    }
    scopeFilters = filterScope === "global" ? sourceConfig.globalFilters : sourceConfig.pageContextFilters;
    return (scopeFilters && scopeFilters[filterLabel]) || null;
  }

  function readFilterCapabilities(filterConfig) {
    var cascade;
    var isUpstream;
    var isSingleSelect;
    if (!filterConfig || typeof filterConfig !== "object") {
      return {
        isUpstream: false,
        isDownstream: false,
        isHierarchy: false,
        isSingleSelect: false,
        isNative: false,
        isSicht: false,
        hasAlleOption: false,
        condition: null
      };
    }
    cascade = String(filterConfig.cascade || "").trim().toLowerCase();
    isUpstream = cascade === "upstream";
    isSingleSelect = isTrueish(filterConfig.isSingleSelect);
    return {
      isUpstream: isUpstream,
      isDownstream: cascade === "downstream",
      isHierarchy: isTrueish(filterConfig.isHierarchy),
      isSingleSelect: isSingleSelect,
      isNative: isTrueish(filterConfig.isNative),
      isSicht: isUpstream && isSingleSelect,
      hasAlleOption: isTrueish(filterConfig.hasAlleOption),
      condition: filterConfig.condition || null
    };
  }

  // Owner payload shape: `isSicht` is intentionally not part of the handoff capabilities.
  function toHandoffCapabilities(capabilities) {
    var source = capabilities || {};
    return {
      isUpstream: source.isUpstream === true,
      isDownstream: source.isDownstream === true,
      isHierarchy: source.isHierarchy === true,
      isSingleSelect: source.isSingleSelect === true,
      isNative: source.isNative === true,
      hasAlleOption: source.hasAlleOption === true,
      condition: source.condition != null ? source.condition : null
    };
  }

  function resolveFilterType(capabilities) {
    var conditionKey;
    if (!capabilities) {
      return "unknown";
    }
    conditionKey = String(capabilities.condition || "").trim().toLowerCase();
    if (capabilities.isUpstream && capabilities.isSingleSelect) {
      return "sicht";
    }
    if (capabilities.isSingleSelect && _config.SPECIAL_SINGLE_SELECT_CONDITION_KEYS.includes(conditionKey)) {
      return "specialSingleSelect";
    }
    if (capabilities.isSingleSelect) {
      return "singleSelect";
    }
    if (capabilities.isHierarchy && capabilities.isDownstream) {
      return "dienststelle";
    }
    if (capabilities.isNative || (!capabilities.isSingleSelect && !capabilities.isHierarchy)) {
      return "nativeMultiSelect";
    }
    return "unknown";
  }

  function findDefinitionEntry(_KDB, scopeType, filterLabel, itemIdHint, source) {
    var filterPropObj = _KDB && _KDB.properties ? _KDB.properties.filterPropObj : null;
    var sourceConfig = filterPropObj && source ? filterPropObj[source] : null;
    var definitions = sourceConfig && sourceConfig.filterInstances ? sourceConfig.filterInstances : null;
    var matches;
    var itemIdMatches;
    if (!definitions || typeof definitions !== "object") {
      return null;
    }
    matches = Object.keys(definitions)
      .map(function (key) { return definitions[key]; })
      .filter(function (entry) {
        return readNormalizedString(entry && entry.scopeType) === scopeType &&
          readNormalizedString(entry && entry.filterLabel) === filterLabel;
      });
    if (matches.length === 1) {
      return matches[0];
    }
    if (!itemIdHint) {
      return null;
    }
    itemIdMatches = matches.filter(function (entry) { return readNormalizedString(entry.itemId) === itemIdHint; });
    return itemIdMatches.length === 1 ? itemIdMatches[0] : null;
  }

  function readFilterInstanceHints(_KDB, scopeType, filterLabel, filterConfig, source) {
    var normalizedLabel = readNormalizedString(filterLabel);
    var itemNameHint = readNormalizedString(filterConfig && filterConfig.itemName) || normalizedLabel;
    var itemIdHint = readNormalizedString(filterConfig && filterConfig.itemId);
    var entry = findDefinitionEntry(_KDB, scopeType, normalizedLabel, itemIdHint, source);
    var instanceKey = entry ? readNormalizedString(entry.instanceKey) : "";
    if (entry) {
      itemNameHint = readNormalizedString(entry.itemName) || itemNameHint;
      itemIdHint = readNormalizedString(entry.itemId) || itemIdHint;
    }
    return {
      itemNameHint: itemNameHint || normalizedLabel || null,
      itemIdHint: itemIdHint || null,
      semanticInstanceKeyHint: instanceKey || null
    };
  }

  function resolveFilterIdentity(_KDB, filterEl, selectors) {
    var filterLabel = readFilterLabel(filterEl, selectors);
    var scopeType = readScopeType(filterEl, selectors);
    var scopeContext = readScopeContext(_KDB, scopeType);
    var tabId = scopeContext.tabId;
    var runtimeScope = scopeType === "global" ? "global" : tabId || "pageContext";
    var kennzahlenSource = _getKennzahlenSource(_KDB);
    var filterConfig = readFilterConfig(_KDB, filterLabel, scopeType, kennzahlenSource);
    var hints = readFilterInstanceHints(_KDB, scopeType, filterLabel, filterConfig, kennzahlenSource);
    var capabilities = toHandoffCapabilities(readFilterCapabilities(filterConfig));

    return {
      filterLabel: filterLabel,
      scopeType: scopeType,
      filterScope: scopeType,
      tabId: tabId,
      scopeId: scopeContext.scopeId,
      scopeResolution: scopeContext.scopeResolution,
      legacyScope: scopeContext.legacyScope,
      legacyScopeId: scopeContext.legacyScopeId,
      tabContextDiagnostic: scopeContext.tabContextDiagnostic,
      filterInstanceId: null,
      itemNameHint: hints.itemNameHint,
      itemIdHint: hints.itemIdHint,
      semanticInstanceKeyHint: hints.semanticInstanceKeyHint,
      filterConfig: _data.cloneJson(filterConfig),
      capabilities: capabilities,
      filterType: resolveFilterType(capabilities),
      filterKey: scopeType + "__" + filterLabel,
      filterId: runtimeScope + "__" + filterLabel
    };
  }

  function buildFilterIdFromElement(_KDB, filterEl, selectors) {
    var filterLabel = readFilterLabel(filterEl, selectors);
    if (!filterLabel) {
      return null;
    }
    return readRuntimeScope(_KDB, readScopeType(filterEl, selectors)) + "__" + filterLabel;
  }

  function buildFilterKeyFromElement(filterEl, selectors) {
    var filterLabel;
    if (!filterEl || !selectors || !selectors.globalDockSelector) {
      return null;
    }
    filterLabel = readFilterLabel(filterEl, selectors);
    if (!filterLabel) {
      return null;
    }
    return readScopeType(filterEl, selectors) + "__" + filterLabel;
  }

  return {
    readFilterLabel: readFilterLabel,
    readScopeContext: readScopeContext,
    readRuntimeScope: readRuntimeScope,
    readFilterConfig: readFilterConfig,
    readFilterCapabilities: readFilterCapabilities,
    toHandoffCapabilities: toHandoffCapabilities,
    resolveFilterType: resolveFilterType,
    readFilterInstanceHints: readFilterInstanceHints,
    resolveFilterIdentity: resolveFilterIdentity,
    buildFilterIdFromElement: buildFilterIdFromElement,
    buildFilterKeyFromElement: buildFilterKeyFromElement
  };
});
