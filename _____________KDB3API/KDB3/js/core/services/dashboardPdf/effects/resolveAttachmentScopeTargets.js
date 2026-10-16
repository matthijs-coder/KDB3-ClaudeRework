define([
  "../../../utils/normalizeCognosScopeId.js"
], function (_normalizeCognosScopeId) {
  "use strict";

  function throwCoded(_code, _message) {
    throw { code: _code, message: _message };
  }

  function buildVisibleTabIdSet(_manifestTabs) {
    var out = {};
    (_manifestTabs || []).forEach(function (tab) {
      if (tab && tab.tabId) {
        out[String(tab.tabId)] = true;
      }
    });
    return out;
  }

  async function resolveAttachmentScopeTargets(_KDB, _manifest, _warnings) {
    var tabsApi = _KDB.api && _KDB.api.tabs;
    var visibleTabIdSet = buildVisibleTabIdSet(_manifest && _manifest.tabs);
    var scopeToTabId = {};
    var diagnostics = [];
    var result;
    if (!tabsApi || typeof tabsApi.dispatch !== "function") {
      throwCoded("DASHBOARD_PDF_SCOPE_TARGET_RESOLVE_FAILED", "tabs dispatch API is unavailable.");
    }
    result = await tabsApi.dispatch({
      type: "tabs/resolveFilterScopeTargets",
      payload: { source: "dashboardPdf" }
    });
    if (!result || result.ok !== true || !result.tabTargets) {
      diagnostics = result && Array.isArray(result.diagnostics) ? result.diagnostics : [];
      throwCoded(
        "DASHBOARD_PDF_SCOPE_TARGET_RESOLVE_FAILED",
        "tabs/resolveFilterScopeTargets failed: " +
          (diagnostics[0] && diagnostics[0].message ? diagnostics[0].message : "unknown tab scope target error")
      );
    }
    Object.keys(result.tabTargets).sort(function (left, right) {
      return Number(left) - Number(right);
    }).forEach(function (tabIdx) {
      var target = result.tabTargets[tabIdx] || {};
      var normalizedScopeId = _normalizeCognosScopeId(target.scopeId);
      var tabId = target.tabId != null ? String(target.tabId) : "";
      if (!normalizedScopeId || !tabId || !visibleTabIdSet[tabId]) {
        return;
      }
      if (scopeToTabId[normalizedScopeId] && scopeToTabId[normalizedScopeId] !== tabId) {
        _warnings.push({
          code: "DASHBOARD_PDF_ATTACHMENT_SCOPE_MAP_WARNING",
          message: "Scope '" + normalizedScopeId + "' maps to multiple visible tabs and is skipped."
        });
        scopeToTabId[normalizedScopeId] = "";
        return;
      }
      if (!scopeToTabId[normalizedScopeId]) {
        scopeToTabId[normalizedScopeId] = tabId;
      }
    });
    return scopeToTabId;
  }

  return resolveAttachmentScopeTargets;
});
