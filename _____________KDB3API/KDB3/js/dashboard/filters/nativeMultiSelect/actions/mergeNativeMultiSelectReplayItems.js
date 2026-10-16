define([], function () {
  "use strict";

  function cloneValues(_values) {
    var result = [];
    var idx;
    for (idx = 0; idx < (_values || []).length; idx += 1) {
      var pair = _values[idx] || {};
      result.push({
        d: pair.d != null ? String(pair.d) : "",
        u: pair.u != null ? String(pair.u) : ""
      });
    }
    return result;
  }

  function cloneItem(_item) {
    var entry = _item || {};
    return {
      itemId: entry.itemId != null ? String(entry.itemId) : "",
      itemName: entry.itemName != null ? String(entry.itemName) : "",
      sourceId: entry.sourceId != null ? String(entry.sourceId) : "",
      values: cloneValues(entry.values)
    };
  }

  // Replaces the replayed item in the stored scope list, or seeds the list from
  // the live inventory when there is nothing stored yet.
  function mergeReplayItem(_oldList, _mergedItem, _liveItems, _itemName) {
    var merged = [];
    var idx;
    var replaced = false;
    if (!_oldList || _oldList.length === 0) {
      for (idx = 0; idx < _liveItems.length; idx += 1) { merged.push(cloneItem(_liveItems[idx])); }
      return merged;
    }
    for (idx = 0; idx < _oldList.length; idx += 1) {
      if (String(_oldList[idx].itemName || "").trim() === _itemName) {
        merged.push(cloneItem(_mergedItem));
        replaced = true;
      } else {
        merged.push(cloneItem(_oldList[idx]));
      }
    }
    if (!replaced) {
      merged.push(cloneItem(_mergedItem));
    }
    return merged;
  }

  return {
    cloneValues: cloneValues,
    cloneItem: cloneItem,
    mergeReplayItem: mergeReplayItem
  };
});
