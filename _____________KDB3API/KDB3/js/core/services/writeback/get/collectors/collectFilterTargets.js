define([
  "../../schema/errorCodes.js",
], function (_errorCodes) {
  "use strict";

  async function collectFilterTargets(_KDB) {
    const tabsApi = _KDB && _KDB.api ? _KDB.api.tabs : null;
    if (!tabsApi || typeof tabsApi.dispatch !== "function") {
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_TABS_NOT_READY,
        "get",
        "tabs API dispatch is unavailable for filter-scope target traversal/readiness"
      );
    }
    const result = await tabsApi.dispatch({
      type: "tabs/resolveFilterScopeTargets",
      payload: { source: "writebackGet" },
    });
    if (!result || result.ok !== true || !result.tabTargets || typeof result.tabTargets !== "object") {
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_TABS_NOT_READY,
        "get",
        "tabs/resolveFilterScopeTargets failed during writeback GET filter readiness",
        { diagnostics: result && result.diagnostics ? result.diagnostics : null }
      );
    }
    return result.tabTargets;
  }

  return collectFilterTargets;
});
