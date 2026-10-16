define([
  "../config/buildDienststelleTableDataInputs.js",
  "../effects/readDienststelleHostSelection.js",
  "../effects/readTabsFacet.js",
  "../effects/deactivateInactiveDienststelleVariants.js"
], function (_tableInputs, _hostSelection, _readTabsFacet, _deactivateInactive) {
  "use strict";

  function readRows(_KDB, _tableKey) {
    var tableData;
    var tableInput;
    try {
      tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
      tableInput = _tableInputs.buildTableInput(_KDB, _tableKey);
      if (!tableData || typeof tableData.readRows !== "function" || !tableInput) {
        return [];
      }
      return tableData.readRows(tableInput) || [];
    } catch (error) {
      console.error("[dienststelle.readRows] failed", { tableKey: _tableKey }, error);
      throw error;
    }
  }

  function waitForData(_waitFn, _timeoutMs) {
    try {
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
    } catch (error) {
      console.error("[dienststelle.waitForData] failed", error);
      throw error;
    }
  }

  // Deterministic scopeId resolution (review D2): use the target's scopeId
  // when present, otherwise match the target's tabId/pageId against the
  // Cognos layout containers. Never index tabs positionally by tabIdx.
  function resolveScopeId(_KDB, _tabIdxToScopeId, _tabIdx) {
    var target;
    var matched;
    try {
      target = _tabIdxToScopeId && _tabIdxToScopeId[String(_tabIdx)];
      if (target && typeof target.scopeId === "string" && target.scopeId !== "") {
        return { ok: true, scopeId: target.scopeId, fromTarget: true };
      }
      matched = target ? matchLayoutScopeId(_KDB, target.tabId, target.pageId) : null;
      if (matched) {
        return { ok: true, scopeId: matched, fromTarget: false };
      }
      return { ok: false, scopeId: null, fromTarget: false };
    } catch (error) {
      console.error("[dienststelle.resolveScopeId] failed", { tabIdx: _tabIdx }, error);
      throw error;
    }
  }

  function listTabDescriptors(_KDB) {
    var tabsFacet = _readTabsFacet(_KDB);
    var outcome;
    if (!tabsFacet || typeof tabsFacet.listTabs !== "function") {
      return [];
    }
    outcome = tabsFacet.listTabs();
    if (!outcome || outcome.ok !== true || !Array.isArray(outcome.data)) {
      return [];
    }
    return outcome.data;
  }

  // Match tabId/pageId against listTabs DTOs. Return the layout id (descriptor.id).
  // pageId is the first-child page id, or the layout id when the tab has no child.
  function matchLayoutScopeId(_KDB, _tabId, _pageId) {
    var items = [];
    var idx;
    var item;
    var containerId;
    var pageId;
    try {
      items = listTabDescriptors(_KDB);
      for (idx = 0; idx < items.length; idx += 1) {
        item = items[idx];
        containerId = item && item.id != null ? String(item.id) : null;
        if (!containerId) { continue; }
        pageId = item.pageId != null ? String(item.pageId) : null;
        if ((_tabId != null && containerId === String(_tabId)) ||
            (_pageId != null && (containerId === String(_pageId) || pageId === String(_pageId)))) {
          return containerId;
        }
      }
      return null;
    } catch (error) {
      console.error("[dienststelle.matchLayoutScopeId] failed", error);
      return null;
    }
  }

  function lookupScopeFilterRef(_KDB, _filterKey, _scope) {
    return _scope === "global"
      ? _hostSelection.lookupFilterRef(_KDB, _filterKey, "global", null)
      : _hostSelection.lookupFilterRef(_KDB, _filterKey, "pageContext", _scope);
  }

  async function realignInactiveVariants(_KDB, _dispatchInternal, _active) {
    try {
      await _deactivateInactive(_KDB, _dispatchInternal, _active);
    } catch (error) {
      console.error("[dienststelle.realignInactiveVariants] failed", error);
      throw error;
    }
  }

  return {
    readRows: readRows,
    waitForData: waitForData,
    resolveScopeId: resolveScopeId,
    lookupScopeFilterRef: lookupScopeFilterRef,
    realignInactiveVariants: realignInactiveVariants
  };
});
