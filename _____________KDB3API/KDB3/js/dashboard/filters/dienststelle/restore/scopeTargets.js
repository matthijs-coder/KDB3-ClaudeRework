define([
  "../config.js",
  "../effects/hostScope/filterRef.js",
  "../../_core/tabMutationScopes.js"
], function (_config, _filterRef, _kitScopes) {
  "use strict";

  function readRows(_KDB, _tableKey) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableInput = _config.buildTableInput(_KDB, _tableKey);
    if (!tableData || typeof tableData.readRows !== "function" || !tableInput) {
      return [];
    }
    return tableData.readRows(tableInput) || [];
  }

  function waitForData(_waitFn, _timeoutMs) {
    return new Promise(function (resolve) {
      var settled = false;
      var timeoutId = setTimeout(function () {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      }, _timeoutMs);
      Promise.resolve(_waitFn()).then(function (ok) {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve(ok === true);
        }
      }, function () {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve(false);
        }
      });
    });
  }

  // The tab descriptors of the layout; a failing facet reads as no tabs and is logged.
  function readTabs(_KDB) {
    try {
      return _filterRef.listTabDescriptors(_KDB);
    } catch (error) {
      console.error("[dienststelle.matchLayoutScopeId] failed", error);
      return null;
    }
  }

  // Deterministic scopeId resolution: use the target's scopeId when present, otherwise match the
  // target's tabId/pageId against the Cognos layout containers. Never index tabs positionally by tabIdx.
  var resolveScopeId = _kitScopes.createScopeIdResolver({ readTabs: readTabs });

  function lookupScopeFilterRef(_KDB, _filterKey, _scope) {
    return _scope === "global"
      ? _filterRef.lookupFilterRef(_KDB, _filterKey, "global", null)
      : _filterRef.lookupFilterRef(_KDB, _filterKey, "pageContext", _scope);
  }

  return {
    readRows: readRows,
    waitForData: waitForData,
    resolveScopeId: resolveScopeId,
    lookupScopeFilterRef: lookupScopeFilterRef
  };
});
