define([
  "../config/actions.js",
  "../effects/listUnownedNativeMultiSelectItems.js",
  "../effects/resolveNativeMultiSelectConfirmScope.js",
  "../history/pushNativeMultiSelectHistoryStep.js",
  "../effects/prepareNativeMultiSelectConfirmWrite.js",
  "../../../widgets/widgetVis/actions/runTopNFilterConfirmWave.js",
  "../../../../core/config/visualizations/topNHelper.js",
  "../../../widgets/widgetVis/effects/readConfirmedJahrYear.js"
], function (
  _actions,
  _listUnownedNativeMultiSelectItems,
  _resolveNativeMultiSelectConfirmScope,
  _pushNativeMultiSelectHistoryStep,
  _prepareNativeMultiSelectConfirmWrite,
  _runTopNFilterConfirmWave,
  _topNHelper,
  _readConfirmedJahrYear
) {
  "use strict";

  function findLiveItem(_liveItems, _itemName) {
    var idx;
    for (idx = 0; idx < _liveItems.length; idx += 1) {
      if (String(_liveItems[idx].itemName || "").trim() === _itemName) { return _liveItems[idx]; }
    }
    return null;
  }

  async function handleFilterDockConfirm(_ctx, _payload) {
    var payload = _payload || {};
    var itemName;
    var scopeKey;
    var liveItems;
    var liveItem;
    var prepared;
    try {
      if (payload.interactionType !== "confirm") { return; }
      if (!Array.isArray(payload.confirmedLabels)) {
        console.warn("[nativeMultiSelect.handleFilterDockConfirm] confirmedLabels missing");
        return;
      }
      itemName = String(payload.filterLabel || payload.itemNameHint || "").trim();
      if (!itemName) { return; }
      scopeKey = await _resolveNativeMultiSelectConfirmScope(_ctx._KDB, payload);
      if (!scopeKey) { return; }
      liveItems = _listUnownedNativeMultiSelectItems(_ctx._KDB, scopeKey, _ctx.filtersFacet);
      liveItem = findLiveItem(liveItems, itemName);
      if (!liveItem) {
        console.warn("[nativeMultiSelect.handleFilterDockConfirm] live item not found");
        return;
      }
      prepared = _prepareNativeMultiSelectConfirmWrite(
        _ctx._KDB,
        payload,
        liveItems,
        liveItem,
        itemName,
        scopeKey
      );
      _ctx.dispatchInternal({
        type: _actions.TAB_MUTATION_SCOPE_WRITE,
        payload: { scopeId: scopeKey, items: prepared.items, clear: false }
      });
      if (payload.skipHistory !== true && payload.isHistoryReplay !== true) {
        startTopNWave(_ctx._KDB, payload, scopeKey, prepared.newValues);
      }
      if (prepared.newValues.length === 0 || payload.skipHistory === true || payload.isHistoryReplay === true) {
        return;
      }
      _pushNativeMultiSelectHistoryStep(
        _ctx._KDB,
        { itemName: itemName, scopeKey: scopeKey, values: prepared.oldValues },
        { itemName: itemName, scopeKey: scopeKey, values: prepared.newValues }
      );
    } catch (err) {
      console.error("[nativeMultiSelect.handleFilterDockConfirm]", err);
    }
  }

  function startTopNWave(_KDB, _payload, _scopeKey, _values) {
    var columnId = _payload.itemIdHint || (_payload.filterConfig && _payload.filterConfig.itemId) || "";
    var table = _topNHelper.resolveTableEntry();
    var isJahr = !!(table && columnId === table.jahrColumnId);
    try {
      Promise.resolve(_runTopNFilterConfirmWave(_KDB, {
        scopeType: _scopeKey === "global" ? "global" : "pageContext",
        tabId: _scopeKey === "global" ? null : _payload.tabId,
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
    console.error("[nativeMultiSelect.handleFilterDockConfirm] topN wave failed", _err);
  }

  return handleFilterDockConfirm;
});
