define([
  "./config.js",
  "./state.js",
  "./inventory.js",
  "./hostFilterIo.js",
  "./commit.js",
  "../../../core/utils/kit/history.js"
], function (_config, _state, _inventory, _hostFilterIo, _commit, _historyKit) {
  "use strict";

  var actions = _config.actions;

  // Replaces the replayed item in the stored scope list, or seeds the list from the live inventory when
  // nothing is stored yet.
  function mergeReplayItem(_oldList, _mergedItem, _liveItems, _itemName) {
    var merged = [];
    var idx;
    var replaced = false;
    if (!_oldList || _oldList.length === 0) {
      for (idx = 0; idx < _liveItems.length; idx += 1) { merged.push(_state.cloneItem(_liveItems[idx])); }
      return merged;
    }
    for (idx = 0; idx < _oldList.length; idx += 1) {
      if (String(_oldList[idx].itemName || "").trim() === _itemName) {
        merged.push(_state.cloneItem(_mergedItem));
        replaced = true;
      } else {
        merged.push(_state.cloneItem(_oldList[idx]));
      }
    }
    if (!replaced) {
      merged.push(_state.cloneItem(_mergedItem));
    }
    return merged;
  }

  // Action handler for HISTORY_REPLAY_REQUESTED: writes the target values to the host item and mirrors them
  // into the owner state. Resolves true when the host write succeeded.
  async function applyHistoryReplay(_ctx, _payload) {
    var payload = _payload || {};
    var target = payload.targetValue || {};
    var itemName = String(target.itemName || "").trim();
    var scopeKey = String(target.scopeKey || "").trim();
    var filtersFacet = _ctx.filtersFacet;
    var filterRef;
    var values;
    var written;
    var writeScopeKey;
    var liveItems;
    var liveItem;
    var mergedItem;
    var oldList;
    if (!itemName || !scopeKey) {
      return false;
    }
    try {
      filterRef = _inventory.lookupRefByName(_ctx._KDB, itemName, scopeKey, filtersFacet);
      if (!filterRef) {
        console.warn("[nativeMultiSelect.historyReplay] dest item skipped", { itemName: itemName, scopeId: scopeKey });
        return false;
      }
      values = _state.cloneValues(target.values);
      written = await _hostFilterIo.writeRef(filtersFacet, filterRef, values);
      if (!written.ok) {
        return false;
      }
      writeScopeKey = _state.reuseByScopeKey(_ctx._KDB, scopeKey) || "global";
      liveItems = _inventory.listUnownedItems(_ctx._KDB, writeScopeKey, filtersFacet);
      liveItem = _commit.findByName(liveItems, itemName);
      mergedItem = liveItem ? _state.cloneItem(liveItem) : {
        itemId: String(filterRef.itemId || ""),
        itemName: itemName,
        sourceId: String(filterRef.sourceId || ""),
        values: values
      };
      oldList = (_state.readByScope(_ctx._KDB)[writeScopeKey] || []).map(_state.cloneItem);
      _ctx.dispatchInternal({
        type: actions.TAB_MUTATION_SCOPE_WRITE,
        payload: { scopeId: writeScopeKey, items: mergeReplayItem(oldList, mergedItem, liveItems, itemName), clear: false }
      });
      _commit.startTopNWave(_ctx._KDB, scopeKey, filterRef.itemId ? String(filterRef.itemId) : "", undefined, values);
      return true;
    } catch (err) {
      console.error("[nativeMultiSelect.applyHistoryReplay]", err);
      return false;
    }
  }

  // Replay entry registered with the history service: the real work runs through the owner's own dispatch so
  // replay writes go through the same state reducer and facet as user commits.
  async function applyReplayStep(_KDB, _targetValue, _step) {
    var api = _KDB && _KDB.api && _KDB.api.nativeMultiSelect;
    var result;
    if (!api || typeof api.dispatch !== "function") {
      return false;
    }
    try {
      result = await api.dispatch({
        type: actions.HISTORY_REPLAY_REQUESTED,
        payload: { targetValue: _targetValue, step: _step, isHistoryReplay: true, skipHistory: true }
      });
      return result === true;
    } catch (err) {
      if (err && err.name === "AbortError") {
        return false;
      }
      console.error("[nativeMultiSelect.applyReplayStep] failed", err);
      return false;
    }
  }

  function createHistoryReplayHandler() {
    var applyByKey = {};
    applyByKey[_config.HISTORY_STEP_KEY] = applyReplayStep;
    return _historyKit.createReplayHandler(applyByKey);
  }

  return {
    createHistoryReplayHandler: createHistoryReplayHandler,
    applyHistoryReplay: applyHistoryReplay,
    mergeReplayItem: mergeReplayItem
  };
});
