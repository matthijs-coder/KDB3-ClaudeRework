define([
  "../config/actions.js",
  "../effects/lookupNativeMultiSelectRefByName.js",
  "../effects/listUnownedNativeMultiSelectItems.js",
  "../effects/stripTabpanel.js",
  "./mergeNativeMultiSelectReplayItems.js",
  "../../../widgets/widgetVis/actions/runTopNFilterConfirmWave.js",
  "../../../../core/config/visualizations/topNHelper.js",
  "../../../widgets/widgetVis/effects/readConfirmedJahrYear.js"
], function (_actions, _lookupNativeMultiSelectRefByName, _listUnownedNativeMultiSelectItems, _stripTabpanel, _replayItems, _runTopNFilterConfirmWave, _topNHelper, _readConfirmedJahrYear) {
  "use strict";

  var cloneValues = _replayItems.cloneValues;
  var cloneItem = _replayItems.cloneItem;
  var mergeReplayItem = _replayItems.mergeReplayItem;

  function readByScope(_KDB) {
    var filtersState = _KDB.state && _KDB.state.filters;
    var ownerState = filtersState && filtersState.nativeMultiSelect;
    return ownerState && ownerState.byScope ? ownerState.byScope : {};
  }

  function resolveWriteScopeKey(_KDB, _scopeKey) {
    var stripped;
    var byScope;
    var keys;
    var idx;
    if (!_scopeKey || _scopeKey === "global") { return "global"; }
    stripped = _stripTabpanel(_scopeKey);
    if (!stripped || stripped === "global") { return "global"; }
    byScope = readByScope(_KDB);
    keys = Object.keys(byScope);
    for (idx = 0; idx < keys.length; idx += 1) {
      if (_stripTabpanel(keys[idx]) === stripped) { return keys[idx]; }
    }
    return _scopeKey;
  }

  function warnDestSkip(_details) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[nativeMultiSelect.historyReplay] dest item skipped", _details);
    }
  }

  async function handleNativeMultiSelectHistoryReplay(_ctx, _payload) {
    var payload = _payload || {};
    var target = payload.targetValue || {};
    var itemName = String(target.itemName || "").trim();
    var scopeKey = String(target.scopeKey || "").trim();
    var writeScopeKey;
    var filtersFacet;
    var filterRef;
    var values;
    var writeOutcome;
    var listScope;
    var liveItems;
    var liveItem;
    var idx;
    var mergedItem;
    var byScope;
    var oldList;
    var merged;
    if (!itemName || !scopeKey) {
      return false;
    }
    try {
      filtersFacet = _ctx.filtersFacet;
      filterRef = _lookupNativeMultiSelectRefByName(_ctx._KDB, itemName, scopeKey, filtersFacet);
      if (!filterRef) {
        warnDestSkip({ itemName: itemName, scopeId: scopeKey });
        return false;
      }
      if (!filtersFacet) {
        return false;
      }
      values = cloneValues(target.values);
      writeOutcome = await filtersFacet.writeFilter({ ref: filterRef, values: values || [] });
      if (!writeOutcome || writeOutcome.ok !== true) {
        return false;
      }
      writeScopeKey = resolveWriteScopeKey(_ctx._KDB, scopeKey);
      listScope = writeScopeKey === "global" ? "global" : writeScopeKey;
      liveItems = _listUnownedNativeMultiSelectItems(_ctx._KDB, listScope, _ctx.filtersFacet);
      liveItem = null;
      for (idx = 0; idx < liveItems.length; idx += 1) {
        if (String(liveItems[idx].itemName || "").trim() === itemName) {
          liveItem = liveItems[idx];
          break;
        }
      }
      if (liveItem) {
        mergedItem = cloneItem(liveItem);
      } else {
        mergedItem = {
          itemId: String(filterRef.itemId || ""),
          itemName: itemName,
          sourceId: String(filterRef.sourceId || ""),
          values: values
        };
      }
      byScope = readByScope(_ctx._KDB);
      oldList = (byScope[writeScopeKey] || []).map(cloneItem);
      merged = mergeReplayItem(oldList, mergedItem, liveItems, itemName);
      _ctx.dispatchInternal({
        type: _actions.TAB_MUTATION_SCOPE_WRITE,
        payload: { scopeId: writeScopeKey, items: merged, clear: false }
      });
      startTopNWave(_ctx._KDB, filterRef, scopeKey, values);
      return true;
    } catch (err) {
      console.error("[nativeMultiSelect.handleNativeMultiSelectHistoryReplay]", err);
      return false;
    }
  }

  function startTopNWave(_KDB, _filterRef, _scopeKey, _values) {
    var table = _topNHelper.resolveTableEntry();
    var columnId = _filterRef && _filterRef.itemId ? String(_filterRef.itemId) : "";
    var isJahr = !!(table && columnId === table.jahrColumnId);
    try {
      Promise.resolve(_runTopNFilterConfirmWave(_KDB, {
        scopeType: _scopeKey === "global" ? "global" : "pageContext",
        scopeId: _scopeKey === "global" ? null : _scopeKey,
        isJahr: isJahr,
        selectedYearKnown: isJahr,
        selectedYear: isJahr ? _readConfirmedJahrYear(_values) : null,
        filterType: "nativeMultiSelect"
      })).then(null, logTopNWave);
    } catch (err) {
      logTopNWave(err);
    }
  }

  function logTopNWave(_err) {
    console.error("[nativeMultiSelect.handleNativeMultiSelectHistoryReplay] topN wave failed", _err);
  }

  return handleNativeMultiSelectHistoryReplay;
});
