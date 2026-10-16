define([
  "../actions/guardTabMutation.js",
  "../actions/applyTabMutationDuplicate.js",
  "./fillDuplicateWidgetContent.js"
], function (_support, _duplicate, _fillDuplicateWidgetContent) {
  "use strict";

  async function applyUserDelete(_context, _payload, _plan, _snapshot, _parked, _moved) {
    try {
      var created = [];
      var degradedEntries = [];
      var hideTabId = _plan.hideSlot && _plan.hideSlot.tabId;
      var placeOptions = _duplicate.buildPlaceOptions(_payload, "tabDelete");
      if (hideTabId) {
        var hideResult = await _duplicate.rebuildDestination(_context, _plan, hideTabId, [], _parked, _moved, placeOptions, _payload.runId);
        if (!hideResult || hideResult.ok !== true) {
          return failApply(_parked, _moved, hideResult && hideResult.message ? hideResult.message : "widget rebuild failed to park the hidden slot.");
        }
      }
      var failed = await rebuildKeys(_context, _payload, _plan, _snapshot, _parked, _moved, placeOptions, created, degradedEntries, hideTabId);
      if (failed) { return failed; }
      return successApply(_payload, _parked, _moved, created, degradedEntries);
    } catch (err) {
      console.error("[widgetBase.applyUserDelete] failed", err);
      throw err;
    }
  }

  async function applyRestoreDeleted(_context, _payload, _plan, _snapshot, _parked, _moved) {
    try {
      var created = [];
      var degradedEntries = [];
      var placeOptions = _duplicate.buildPlaceOptions(_payload, "tabRestore");
      var failed = await rebuildKeys(_context, _payload, _plan, _snapshot, _parked, _moved, placeOptions, created, degradedEntries, null);
      if (failed) { return failed; }
      return successApply(_payload, _parked, _moved, created, degradedEntries);
    } catch (err) {
      console.error("[widgetBase.applyRestoreDeleted] failed", err);
      throw err;
    }
  }

  async function rebuildKeys(_context, _payload, _plan, _snapshot, _parked, _moved, _placeOptions, _created, _degradedEntries, _skipTabId) {
    try {
      var rebuildMap = _snapshot.rebuildByTabId || {};
      var keys = Object.keys(rebuildMap);
      var index = 0;
      while (index < keys.length) {
        if (keys[index] !== _skipTabId) {
          var rows = Array.isArray(rebuildMap[keys[index]]) ? rebuildMap[keys[index]] : [];
          var slotResult = await _duplicate.rebuildDestination(_context, _plan, keys[index], rows, _parked, _moved, _placeOptions, _payload.runId);
          _duplicate.recordCreated(_snapshot, slotResult && slotResult.created);
          if (!slotResult || slotResult.ok !== true || slotResult.structural || slotResult.superseded) {
            return failApply(_parked, _moved, slotResult && slotResult.message ? slotResult.message : "widget rebuild failed.");
          }
          pushAll(_created, slotResult.created);
          pushAll(_degradedEntries, slotResult.degradedEntries);
          if (slotResult.created && slotResult.created.length > 0) {
            if (_support.isStale(_context._KDB, _payload.runId)) {
              return failApply(_parked, _moved, "widgetBase tab mutation superseded during widget rebuild.");
            }
            var fillResult = await _fillDuplicateWidgetContent(_context, slotResult.created, rows);
            pushAll(_degradedEntries, fillResult && fillResult.degraded);
          }
        }
        index += 1;
      }
      return null;
    } catch (err) {
      console.error("[widgetBase.rebuildKeys] failed", err);
      throw err;
    }
  }

  function pushAll(target, rows) {
    try {
      var list = Array.isArray(rows) ? rows : [];
      var index = 0;
      while (index < list.length) {
        target.push(list[index]);
        index += 1;
      }
    } catch (err) {
      console.error("[widgetBase.pushAll] failed", err);
      throw err;
    }
  }

  function successApply(_payload, _parked, _moved, _created, _degradedEntries) {
    return { ok: true, operationId: _payload.operationId, moved: _moved, parked: _parked, created: _created, degradedEntries: _degradedEntries, diagnostics: [] };
  }

  function failApply(_parked, _moved, _message) {
    return { ok: false, moved: _moved, parked: _parked, diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", message: _message }] };
  }

  return {
    applyUserDelete: applyUserDelete,
    applyRestoreDeleted: applyRestoreDeleted
  };
});
