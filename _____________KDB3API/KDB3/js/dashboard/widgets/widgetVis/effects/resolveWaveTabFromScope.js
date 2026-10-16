define([
  "../../../tabs/state/selectors.js"
], function (_tabsSelectors) {
  "use strict";

  function __controller(_KDB, _scopeId) {
    var scopeId = _scopeId == null ? "" : String(_scopeId).trim();
    var tabsApi;
    if (!scopeId) {
      return Promise.resolve(null);
    }
    tabsApi = _KDB && _KDB.api ? _KDB.api.tabs : null;
    if (!tabsApi || typeof tabsApi.dispatch !== "function") {
      console.warn("[widgetVis.resolveWaveTabFromScope] tabs api missing", { scopeId: scopeId });
      return Promise.resolve(null);
    }
    return tabsApi.dispatch({
      type: "tabs/resolveFilterScopeTargets",
      payload: { source: "topNFilterWave" }
    }).then(readMatch.bind(null, _KDB, scopeId), failMatch.bind(null, scopeId));
  }

  function readMatch(_KDB, _scopeId, _result) {
    var match;
    if (!_result || _result.ok !== true) {
      console.warn("[widgetVis.resolveWaveTabFromScope] scope targets missing", { scopeId: _scopeId });
      return null;
    }
    match = _tabsSelectors.readTabScopeMatch(_KDB, _scopeId, _result.tabTargets);
    if (!match || match.status !== "ok" || !match.tab || !match.tab.tabId) {
      console.warn("[widgetVis.resolveWaveTabFromScope] no unique tab", {
        scopeId: _scopeId,
        status: match && match.status
      });
      return null;
    }
    return match.tab.tabId;
  }

  function failMatch(_scopeId, _err) {
    console.error("[widgetVis.resolveWaveTabFromScope] failed", { scopeId: _scopeId }, _err);
    return null;
  }

  return __controller;
});
