define(["./mapNativeMultiSelectConfirmedValues.js"], function (
  _mapNativeMultiSelectConfirmedValues
) {
  "use strict";

  function materializeVals(_values) {
    var result = [];
    var idx;
    for (idx = 0; idx < (_values || []).length; idx += 1) {
      var pair = _values[idx] || {};
      var d = String(pair.d == null ? "" : pair.d).trim();
      var u = String(pair.u == null ? "" : pair.u).trim();
      if (d !== "" && u !== "") { result.push({ d: d, u: u }); }
    }
    return result;
  }

  function cloneItem(_item) {
    var entry = _item || {};
    var values = [];
    var idx;
    for (idx = 0; idx < (entry.values || []).length; idx += 1) {
      var pair = entry.values[idx] || {};
      values.push({ d: pair.d != null ? String(pair.d) : "", u: pair.u != null ? String(pair.u) : "" });
    }
    return {
      itemId: entry.itemId != null ? String(entry.itemId) : "",
      itemName: entry.itemName != null ? String(entry.itemName) : "",
      sourceId: entry.sourceId != null ? String(entry.sourceId) : "",
      values: values
    };
  }

  function concatKnown(_hostVals, _oldVals) {
    var merged = [];
    var seen = {};
    var list = (_hostVals || []).concat(_oldVals || []);
    var idx;
    var pair;
    var d;
    for (idx = 0; idx < list.length; idx += 1) {
      pair = list[idx] || {};
      d = String(pair.d == null ? "" : pair.d).trim();
      if (!d || seen[d]) { continue; }
      seen[d] = true;
      merged.push(pair);
    }
    return merged;
  }

  function mergeConfirmedItem(_oldList, _confirmedItem, _liveItems, _itemName) {
    var merged = [];
    var idx;
    var replaced = false;
    if (!_oldList || _oldList.length === 0) {
      for (idx = 0; idx < _liveItems.length; idx += 1) {
        merged.push(
          String(_liveItems[idx].itemName || "").trim() === _itemName
            ? cloneItem(_confirmedItem)
            : cloneItem(_liveItems[idx])
        );
      }
      return merged;
    }
    for (idx = 0; idx < _oldList.length; idx += 1) {
      if (String(_oldList[idx].itemName || "").trim() === _itemName) {
        merged.push(cloneItem(_confirmedItem));
        replaced = true;
      } else {
        merged.push(cloneItem(_oldList[idx]));
      }
    }
    if (!replaced) { merged.push(cloneItem(_confirmedItem)); }
    return merged;
  }

  function readItemId(_payload, _liveItem) {
    var filterConfig = _payload && _payload.filterConfig ? _payload.filterConfig : {};
    return String(
      filterConfig.itemId || _payload.itemIdHint || (_liveItem && _liveItem.itemId) || ""
    ).trim();
  }

  function prepareNativeMultiSelectConfirmWrite(_KDB, _payload, _liveItems, _liveItem, _itemName, _scopeKey) {
    var ownerState = _KDB.state && _KDB.state.filters && _KDB.state.filters.nativeMultiSelect;
    var byScope = ownerState && ownerState.byScope ? ownerState.byScope : {};
    var oldList = (byScope[_scopeKey] || []).map(cloneItem);
    var oldItem = null;
    var idx;
    var confirmedItem;
    var newVals;
    for (idx = 0; idx < oldList.length; idx += 1) {
      if (String(oldList[idx].itemName || "").trim() === _itemName) {
        oldItem = oldList[idx];
        break;
      }
    }
    newVals = _mapNativeMultiSelectConfirmedValues(
      _payload.confirmedLabels,
      concatKnown(_liveItem.values, oldItem ? oldItem.values : []),
      readItemId(_payload, _liveItem)
    );
    confirmedItem = cloneItem(_liveItem);
    confirmedItem.values = newVals;
    return {
      oldValues: oldItem ? materializeVals(oldItem.values) : [],
      newValues: newVals,
      items: mergeConfirmedItem(oldList, confirmedItem, _liveItems, _itemName)
    };
  }

  return prepareNativeMultiSelectConfirmWrite;
});
