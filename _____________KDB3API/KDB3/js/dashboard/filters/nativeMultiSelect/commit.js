define([
  "./config.js",
  "./state.js",
  "./inventory.js",
  "../../../core/utils/kit/history.js",
  "../_core/events.js"
], function (_config, _state, _inventory, _historyKit, _filterEvents) {
  "use strict";

  var actions = _config.actions;

  // ---------- confirmed values ----------

  function findUseValue(_pairs, _display) {
    var idx;
    for (idx = 0; idx < _pairs.length; idx += 1) {
      if (_pairs[idx].d === _display) {
        return _pairs[idx].u;
      }
    }
    return "";
  }

  function buildTm1UseValue(_itemId, _display) {
    var id = String(_itemId || "").trim();
    var display = String(_display || "").trim();
    var parts = [];
    var re = /\[([^\]]+)\]/g;
    var match;
    if (!id || !display) {
      return "";
    }
    if (display.indexOf("->[") !== -1) {
      return display;
    }
    while ((match = re.exec(id))) {
      parts.push(match[1]);
    }
    if (parts.length < 3) {
      return "";
    }
    return id + "->:[TMR].[" + parts[1] + "].[" + parts[2] + "].[" + display + "]";
  }

  // Display labels confirmed in the dock -> {d, u} pairs. A label without a known or buildable use value is dropped.
  function mapConfirmedValues(_labels, _knownValues, _itemId) {
    var known = _state.materializeValues(_knownValues);
    var result = [];
    var idx;
    var display;
    var useValue;
    for (idx = 0; idx < (_labels || []).length; idx += 1) {
      display = String(_labels[idx] == null ? "" : _labels[idx]).trim();
      if (!display) {
        continue;
      }
      useValue = findUseValue(known, display) || buildTm1UseValue(_itemId, display);
      if (!useValue) {
        console.warn("[nativeMultiSelect.mapConfirmedValues] missing u for label", display);
        continue;
      }
      result.push({ d: display, u: useValue });
    }
    return result;
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

  function findByName(_items, _itemName) {
    var idx;
    for (idx = 0; idx < _items.length; idx += 1) {
      if (String(_items[idx].itemName || "").trim() === _itemName) { return _items[idx]; }
    }
    return null;
  }

  function mergeConfirmedItem(_oldList, _confirmedItem, _liveItems, _itemName) {
    var merged = [];
    var idx;
    var replaced = false;
    if (!_oldList || _oldList.length === 0) {
      for (idx = 0; idx < _liveItems.length; idx += 1) {
        merged.push(
          String(_liveItems[idx].itemName || "").trim() === _itemName
            ? _state.cloneItem(_confirmedItem)
            : _state.cloneItem(_liveItems[idx])
        );
      }
      return merged;
    }
    for (idx = 0; idx < _oldList.length; idx += 1) {
      if (String(_oldList[idx].itemName || "").trim() === _itemName) {
        merged.push(_state.cloneItem(_confirmedItem));
        replaced = true;
      } else {
        merged.push(_state.cloneItem(_oldList[idx]));
      }
    }
    if (!replaced) { merged.push(_state.cloneItem(_confirmedItem)); }
    return merged;
  }

  function readItemId(_payload, _liveItem) {
    var filterConfig = _payload && _payload.filterConfig ? _payload.filterConfig : {};
    return String(
      filterConfig.itemId || _payload.itemIdHint || (_liveItem && _liveItem.itemId) || ""
    ).trim();
  }

  function prepareConfirmWrite(_KDB, _payload, _liveItems, _liveItem, _itemName, _scopeKey) {
    var oldList = (_state.readByScope(_KDB)[_scopeKey] || []).map(_state.cloneItem);
    var oldItem = findByName(oldList, _itemName);
    var newValues = mapConfirmedValues(
      _payload.confirmedLabels,
      concatKnown(_liveItem.values, oldItem ? oldItem.values : []),
      readItemId(_payload, _liveItem)
    );
    var confirmedItem = _state.cloneItem(_liveItem);
    confirmedItem.values = newValues;
    return {
      oldValues: oldItem ? _state.materializeValues(oldItem.values) : [],
      newValues: newValues,
      items: mergeConfirmedItem(oldList, confirmedItem, _liveItems, _itemName)
    };
  }

  // ---------- scope ----------

  function matchTabTargetScopeId(_tabTargets, _tabId) {
    var keys = Object.keys(_tabTargets || {});
    var idx;
    var target;
    var tabId = String(_tabId || "");
    for (idx = 0; idx < keys.length; idx += 1) {
      target = _tabTargets[keys[idx]] || {};
      if (String(target.tabId || "") === tabId && target.scopeId) {
        return String(target.scopeId);
      }
    }
    return "";
  }

  function resolveFromTabTargets(_KDB, _tabId, _result) {
    var resolved;
    if (!_result || _result.ok !== true) { return ""; }
    resolved = matchTabTargetScopeId(_result.tabTargets, _tabId);
    if (!resolved) { return ""; }
    return _state.reuseByScopeKey(_KDB, resolved);
  }

  async function resolveConfirmScope(_KDB, _payload) {
    var payload = _payload || {};
    var filterScope = payload.filterScope || "";
    var scopeType = payload.scopeType || "";
    var tabsApi;
    var providedScope;
    var result;
    var scopeKey;
    if (filterScope === "global" || scopeType === "global") {
      return "global";
    }
    providedScope = payload.scopeId != null ? String(payload.scopeId).trim() : "";
    if (providedScope && _state.stripTabpanel(providedScope) !== "global") {
      return _state.reuseByScopeKey(_KDB, providedScope) || providedScope;
    }
    tabsApi = _KDB && _KDB.api ? _KDB.api.tabs : null;
    if (payload.tabId && tabsApi && typeof tabsApi.dispatch === "function") {
      result = await tabsApi.dispatch({
        type: "tabs/resolveFilterScopeTargets",
        payload: { source: "nativeMultiSelectConfirm" }
      });
      scopeKey = resolveFromTabTargets(_KDB, payload.tabId, result);
      if (scopeKey) { return scopeKey; }
    }
    console.warn("[nativeMultiSelect.resolveConfirmScope] page scope unresolved", { tabId: payload.tabId || null });
    return "";
  }

  // ---------- history step ----------

  function cloneSnapshot(_snapshot) {
    var snap = _snapshot || {};
    return {
      itemName: snap.itemName != null ? String(snap.itemName) : "",
      scopeKey: snap.scopeKey != null ? String(snap.scopeKey) : "",
      values: _state.cloneValues(snap.values)
    };
  }

  function buildCommittedStep(_oldSnapshot, _newSnapshot, _timestamp) {
    return {
      key: _config.HISTORY_STEP_KEY,
      timestamp: typeof _timestamp === "number" && isFinite(_timestamp) ? _timestamp : Date.now(),
      old: cloneSnapshot(_oldSnapshot),
      new: cloneSnapshot(_newSnapshot)
    };
  }

  // The history service already rejects equal steps and steps pushed during a writeback restore.
  function pushConfirmedStep(_KDB, _oldSnapshot, _newSnapshot) {
    if (String(_oldSnapshot.itemName || "") !== String(_newSnapshot.itemName || "")) { return false; }
    if (String(_oldSnapshot.scopeKey || "") !== String(_newSnapshot.scopeKey || "")) { return false; }
    if (!_newSnapshot.values || _newSnapshot.values.length === 0) { return false; }
    return _historyKit.pushHistoryStep(_KDB, buildCommittedStep(_oldSnapshot, _newSnapshot, Date.now()));
  }

  // ---------- TopN wave ----------

  function startTopNWave(_KDB, _scopeKey, _columnId, _tabId, _values) {
    _filterEvents.emitConfirmed(_KDB, {
      filterType: "nativeMultiSelect",
      scopeType: _scopeKey === "global" ? "global" : "pageContext",
      tabId: _tabId,
      scopeId: _scopeKey === "global" ? null : _scopeKey,
      columnId: _columnId,
      confirmedValues: Array.isArray(_values) ? _values : []
    });
  }

  // ---------- dock confirm ----------

  async function commitFilterDockConfirm(_ctx, _payload) {
    var payload = _payload || {};
    var itemName;
    var scopeKey;
    var liveItems;
    var liveItem;
    var prepared;
    var skipsHistory;
    try {
      if (payload.interactionType !== "confirm") { return; }
      if (!Array.isArray(payload.confirmedLabels)) {
        console.warn("[nativeMultiSelect.commitFilterDockConfirm] confirmedLabels missing");
        return;
      }
      itemName = String(payload.filterLabel || payload.itemNameHint || "").trim();
      if (!itemName) { return; }
      scopeKey = await resolveConfirmScope(_ctx._KDB, payload);
      if (!scopeKey) { return; }
      liveItems = _inventory.listUnownedItems(_ctx._KDB, scopeKey, _ctx.filtersFacet);
      liveItem = findByName(liveItems, itemName);
      if (!liveItem) {
        console.warn("[nativeMultiSelect.commitFilterDockConfirm] live item not found");
        return;
      }
      prepared = prepareConfirmWrite(_ctx._KDB, payload, liveItems, liveItem, itemName, scopeKey);
      _ctx.dispatchInternal({
        type: actions.TAB_MUTATION_SCOPE_WRITE,
        payload: { scopeId: scopeKey, items: prepared.items, clear: false }
      });
      skipsHistory = payload.skipHistory === true || payload.isHistoryReplay === true;
      if (!skipsHistory) {
        startTopNWave(_ctx._KDB, scopeKey, payload.itemIdHint || (payload.filterConfig && payload.filterConfig.itemId) || "",
          scopeKey === "global" ? null : payload.tabId, prepared.newValues);
      }
      if (prepared.newValues.length === 0 || skipsHistory) {
        return;
      }
      pushConfirmedStep(
        _ctx._KDB,
        { itemName: itemName, scopeKey: scopeKey, values: prepared.oldValues },
        { itemName: itemName, scopeKey: scopeKey, values: prepared.newValues }
      );
    } catch (err) {
      console.error("[nativeMultiSelect.commitFilterDockConfirm]", err);
    }
  }

  return {
    commitFilterDockConfirm: commitFilterDockConfirm,
    mapConfirmedValues: mapConfirmedValues,
    prepareConfirmWrite: prepareConfirmWrite,
    buildCommittedStep: buildCommittedStep,
    startTopNWave: startTopNWave,
    findByName: findByName
  };
});
