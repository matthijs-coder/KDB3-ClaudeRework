define([
  "../../../core/utils/normalizeCognosScopeId.js",
  "../../../core/utils/kit/errors.js",
  "../config.js",
  "./text.js"
], function (_normalizeCognosScopeId, _errors, _config, _text) {
  "use strict";

  var CODES = _config.CODES;
  var ORDERED_LABELS = ["Sicht", "Jahr", "Dienststelle", "Berufsfamilie", "Dienstverhältnis", "Geschlecht", "Altersgruppe", "Dienststellenleitung", "Personengruppe"];
  var DISPLAY_SOURCE_ALLOWLIST = { cognos: true, table: true, policy: true };
  var SPECIAL_LABEL_GUARD = { Dienststellenleitung: true, Personengruppe: true };
  var SCOPE_MAP_WARNING = "DASHBOARD_PDF_ATTACHMENT_SCOPE_MAP_WARNING";
  var DISPLAY_UNAVAILABLE_WARNING = "DASHBOARD_PDF_FILTER_DISPLAY_UNAVAILABLE";

  // Label buckets: { [label]: { values: string[], seen: { [value]: true } } }, de-duplicated per label.

  function toDisplay(value) {
    return _text.cleanValue(value == null ? "" : String(value));
  }

  function ensureLabelBucket(bucket, label) {
    if (!bucket[label]) bucket[label] = { values: [], seen: {} };
    return bucket[label];
  }

  function pushDisplay(bucket, label, value) {
    var entry = ensureLabelBucket(bucket, label);
    var display = toDisplay(value);
    if (!display || entry.seen[display]) return;
    entry.seen[display] = true;
    entry.values.push(display);
  }

  function namedMultilineText(named) {
    return named.map(function (item) { return item.label + ": " + item.value; }).join("\n");
  }

  function warnDisplayUnavailable(warnings, message, filterInstanceId) {
    var warning = { code: DISPLAY_UNAVAILABLE_WARNING, message: message };
    if (filterInstanceId !== undefined) warning.filterInstanceId = filterInstanceId;
    warnings.push(warning);
  }

  // ---- singleSelect inventory --------------------------------------------------------------------------------

  /**
   * @returns {Promise<object>} fresh singleSelect state (reconciles the filter instances first when stale)
   * @throws {Error} coded FILTER_PREPARATION_FAILED
   */
  async function ensureFreshSingleSelectInventory(_KDB) {
    var api = _KDB.api && _KDB.api.singleSelect;
    if (!api || typeof api.getState !== "function" || typeof api.dispatch !== "function") {
      throw _errors.codedError(CODES.FILTER_PREPARATION_FAILED, "singleSelect API is unavailable.");
    }
    var state = api.getState() || {};
    if (state.inventory && state.inventory.freshness === "fresh") return state;
    var reconcileResult = await api.dispatch({ type: "singleSelect/reconcileFilterInstances", payload: { reason: "filtersReady" } });
    state = api.getState() || {};
    if (!reconcileResult || reconcileResult.ok !== true || !state.inventory || state.inventory.freshness !== "fresh") {
      throw _errors.codedError(CODES.FILTER_PREPARATION_FAILED, "singleSelect inventory is not fresh for dashboardPdf export.");
    }
    return state;
  }

  function readCanonicalDisplay(instance, warnings) {
    var selection = instance && instance.currentSelection;
    var source = selection && selection.displaySource ? String(selection.displaySource) : "";
    var label = _text.cleanLabel(instance && instance.filterLabel) || "<unknown>";
    var problem = !DISPLAY_SOURCE_ALLOWLIST[source] ? "invalid displaySource" : null;
    if (!problem && (selection.displayValue == null || toDisplay(selection.displayValue) === "")) problem = "missing displayValue";
    if (problem) {
      warnDisplayUnavailable(warnings, "Display value is unavailable for '" + label + "' (" + problem + ").", instance && instance.filterInstanceId);
      return "";
    }
    return toDisplay(selection.displayValue);
  }

  function collectSpecialVisibility(specialState) {
    var byFilterId = (specialState || {}).byFilterId || {};
    var out = {};
    Object.keys(byFilterId).forEach(function (id) {
      var record = byFilterId[id];
      if (record && record.isVisible === true) out[_text.cleanLabel(record.filterLabel || id)] = true;
    });
    return out;
  }

  // ---- scope -> tab mapping ------------------------------------------------------------------------------------

  /**
   * @returns {Promise<Object<string, string>>} normalized Cognos scope id -> visible tabId ("" when ambiguous)
   * @throws {Error} coded SCOPE_TARGET_RESOLVE_FAILED
   */
  async function resolveAttachmentScopeTargets(_KDB, manifest, warnings) {
    var tabsApi = _KDB.api && _KDB.api.tabs;
    if (!tabsApi || typeof tabsApi.dispatch !== "function") {
      throw _errors.codedError(CODES.SCOPE_TARGET_RESOLVE_FAILED, "tabs dispatch API is unavailable.");
    }
    var visibleTabIds = {};
    (manifest.tabs || []).forEach(function (tab) {
      if (tab && tab.tabId) visibleTabIds[String(tab.tabId)] = true;
    });
    var result = await tabsApi.dispatch({ type: "tabs/resolveFilterScopeTargets", payload: { source: "dashboardPdf" } });
    if (!result || result.ok !== true || !result.tabTargets) {
      var diagnostics = result && Array.isArray(result.diagnostics) ? result.diagnostics : [];
      throw _errors.codedError(
        CODES.SCOPE_TARGET_RESOLVE_FAILED,
        "tabs/resolveFilterScopeTargets failed: " + (diagnostics[0] && diagnostics[0].message ? diagnostics[0].message : "unknown tab scope target error")
      );
    }
    var scopeToTabId = {};
    Object.keys(result.tabTargets).sort(function (left, right) { return Number(left) - Number(right); }).forEach(function (tabIdx) {
      var target = result.tabTargets[tabIdx] || {};
      var scopeId = _normalizeCognosScopeId(target.scopeId);
      var tabId = target.tabId != null ? String(target.tabId) : "";
      if (!scopeId || !tabId || !visibleTabIds[tabId]) return;
      if (scopeToTabId[scopeId] && scopeToTabId[scopeId] !== tabId) {
        warnings.push({ code: SCOPE_MAP_WARNING, message: "Scope '" + scopeId + "' maps to multiple visible tabs and is skipped." });
        scopeToTabId[scopeId] = "";
        return;
      }
      if (!scopeToTabId[scopeId]) scopeToTabId[scopeId] = tabId;
    });
    return scopeToTabId;
  }

  // ---- filters owned by sicht / dienststelle -------------------------------------------------------------------

  function appendSicht(sichtState, globalByLabel, warnings) {
    ensureLabelBucket(globalByLabel, "Sicht");
    if (!sichtState) {
      warnDisplayUnavailable(warnings, "Sicht state is unavailable.");
      return;
    }
    if (sichtState.currentSelection && sichtState.currentSelection.displayValue != null) {
      pushDisplay(globalByLabel, "Sicht", sichtState.currentSelection.displayValue);
      if (globalByLabel.Sicht.values.length > 0) return;
    }
    if (sichtState.activeSichtValue != null) {
      pushDisplay(globalByLabel, "Sicht", sichtState.activeSichtValue);
      warnings.push({
        code: "DASHBOARD_PDF_SICHT_FALLBACK_USED",
        message: "Sicht used activeSichtValue fallback because currentSelection.displayValue is unavailable."
      });
      return;
    }
    warnDisplayUnavailable(warnings, "Sicht display value is unavailable.");
  }

  function appendVisibleSpecials(visibleLabels, globalByLabel, warnings) {
    Object.keys(visibleLabels).forEach(function (label) {
      if (SPECIAL_LABEL_GUARD[label] && !globalByLabel[label]) {
        ensureLabelBucket(globalByLabel, label);
        warnDisplayUnavailable(warnings, label + " canonical display value is unavailable.");
      }
    });
  }

  function appendGlobalDienststelle(entry, globalByLabel, warnings) {
    var globalEntry = entry && entry.currentSelectionByScope && entry.currentSelectionByScope.global;
    var values = globalEntry && Array.isArray(globalEntry.currentValues) ? globalEntry.currentValues : [];
    ensureLabelBucket(globalByLabel, "Dienststelle");
    values.forEach(function (value) {
      if (value && value.displayValue != null) pushDisplay(globalByLabel, "Dienststelle", value.displayValue);
    });
    if (globalByLabel.Dienststelle.values.length === 0) {
      warnDisplayUnavailable(warnings, "Dienststelle global display values are unavailable.");
    }
  }

  function appendScopedDienststelle(entry, scopeToTabId, tabById, warnings) {
    var pageContext = entry && entry.currentSelectionByScope && entry.currentSelectionByScope.pageContext;
    Object.keys(pageContext || {}).sort().forEach(function (scopeId) {
      var scopedEntry = pageContext[scopeId];
      var values = scopedEntry && Array.isArray(scopedEntry.currentValues) ? scopedEntry.currentValues : [];
      var tabId = scopeToTabId[_normalizeCognosScopeId(scopeId)];
      if (!tabId || !tabById[tabId]) {
        warnings.push({ code: SCOPE_MAP_WARNING, message: "Skipped scoped Dienststelle values: tab mapping unresolved for scope '" + scopeId + "'." });
        return;
      }
      var bucket = ensureLabelBucket(tabById[tabId], "Dienststelle");
      values.forEach(function (value) {
        var before = bucket.values.length;
        if (value && value.displayValue != null) pushDisplay(tabById[tabId], "Dienststelle", value.displayValue);
        if (bucket.values.length === before) {
          warnDisplayUnavailable(warnings, "Dienststelle scoped display value is unavailable for scope '" + scopeId + "'.");
        }
      });
    });
  }

  function appendOwnerFilters(owner, visibleLabels, scopeToTabId, tabById, globalByLabel, warnings) {
    var state = owner.dienststelleState || {};
    var activeEntry = state.byFilter && state.activeFilterKey ? state.byFilter[state.activeFilterKey] : null;
    appendSicht(owner.sichtState, globalByLabel, warnings);
    appendVisibleSpecials(visibleLabels, globalByLabel, warnings);
    appendGlobalDienststelle(activeEntry, globalByLabel, warnings);
    appendScopedDienststelle(activeEntry, scopeToTabId, tabById, warnings);
  }

  // ---- singleSelect instances ----------------------------------------------------------------------------------

  function isReportableInstance(instance, label, visibleSpecialLabels) {
    if (!instance || !label || ORDERED_LABELS.indexOf(label) === -1) return false;
    if (label === "Dienststelle" || label === "Sicht") return false;
    if (instance.selectionOwner !== "singleSelect" || instance.status !== "active" || instance.hostStatus !== "present") return false;
    return !SPECIAL_LABEL_GUARD[label] || visibleSpecialLabels[label] === true;
  }

  function appendInstanceFilters(instancesById, visibleSpecialLabels, scopeToTabId, tabById, globalByLabel, warnings) {
    Object.keys(instancesById).sort().forEach(function (id) {
      var instance = instancesById[id];
      var label = _text.cleanLabel(instance && instance.filterLabel);
      if (!isReportableInstance(instance, label, visibleSpecialLabels)) return;
      if (instance.scopeType === "global") {
        pushDisplay(globalByLabel, label, readCanonicalDisplay(instance, warnings));
        return;
      }
      if (instance.scopeType !== "pageContext") return;
      var tabId = scopeToTabId[_normalizeCognosScopeId(instance.scopeId)];
      if (!tabId || !tabById[tabId]) {
        warnings.push({
          code: SCOPE_MAP_WARNING,
          message: "Skipped page-context filter '" + label + "' because tab mapping is unresolved for scope '" + String(instance.scopeId || "") + "'.",
          filterInstanceId: instance.filterInstanceId
        });
        return;
      }
      pushDisplay(tabById[tabId], label, readCanonicalDisplay(instance, warnings));
    });
  }

  function toNamedValues(byLabel) {
    return ORDERED_LABELS.filter(function (label) { return !!byLabel[label]; }).map(function (label) {
      return { label: label, value: byLabel[label].values.join("; ") };
    });
  }

  /**
   * Builds the attachment's filter rows: one global text and one row per visible tab.
   * `owner` carries the sicht / dienststelle / special-select states, `singleSelectState` the fresh inventory.
   * @returns {Promise<{globalText: string, tabRows: Array<{label: string, value: string}>}>}
   * @throws {Error} coded SCOPE_TARGET_RESOLVE_FAILED
   */
  async function collectAttachmentFilterRows(_KDB, manifest, owner, singleSelectState, warnings, labels) {
    var globalByLabel = {};
    var tabById = {};
    var visibleSpecialLabels = collectSpecialVisibility(owner.specialState);
    var scopeToTabId = await resolveAttachmentScopeTargets(_KDB, manifest, warnings);
    (manifest.tabs || []).forEach(function (tab) { tabById[tab.tabId] = {}; });
    appendInstanceFilters(singleSelectState.instancesById || {}, visibleSpecialLabels, scopeToTabId, tabById, globalByLabel, warnings);
    appendOwnerFilters(owner, visibleSpecialLabels, scopeToTabId, tabById, globalByLabel, warnings);
    return {
      globalText: namedMultilineText(toNamedValues(globalByLabel)),
      tabRows: (manifest.tabs || []).map(function (tab) {
        return {
          label: _text.cleanLabel(tab.name) + labels.tabFilterSuffix,
          value: namedMultilineText(toNamedValues(tabById[tab.tabId] || {}))
        };
      })
    };
  }

  return {
    ensureFreshSingleSelectInventory: ensureFreshSingleSelectInventory,
    collectAttachmentFilterRows: collectAttachmentFilterRows
  };
});
