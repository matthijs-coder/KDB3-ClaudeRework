define([
  "./guard.js",
  "./placeEntries.js",
  "../../widgetSettings/config/actionTypes.js",
  "../../widgetText/config/actionTypes.js",
  "../../widgetVis/config/actionTypes.js",
  "../../../../core/services/writeback/set/state/ensureWritebackRuntime.js"
], function (_guard, _placeEntries, _settingsActionTypes, _textActionTypes, _visActionTypes, _ensureWritebackRuntime) {
  "use strict";

  var APPLY_FAILED = "TABS_MUTATION_APPLY_FAILED";
  var FILL_FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  var DUPLICATE_MESSAGES = {
    failed: "widgetBase tab mutation superseded during duplicate apply",
    superseded: "widgetBase tab mutation superseded during duplicate apply"
  };
  var REBUILD_MESSAGES = {
    failed: "widget rebuild failed.",
    superseded: "widgetBase tab mutation superseded during widget rebuild."
  };
  // delete covers both the user delete and the widgetRebuild delete (undo of a duplicate): the hidden slot is
  // parked first and skipped by the rebuild loop. Only duplicate skips empty rows that are not a slotMove source.
  var VARIANTS = {
    duplicate: { reason: "tabDuplicate", skipEmpty: true, messages: DUPLICATE_MESSAGES },
    delete: { reason: "tabDelete", parkHideSlot: true, messages: REBUILD_MESSAGES },
    restoreDeleted: { reason: "tabRestore", messages: REBUILD_MESSAGES },
    move: { reason: "tabMove", messages: REBUILD_MESSAGES }
  };

  function failApply(_parked, _moved, _message) {
    return { ok: false, moved: _moved, parked: _parked, diagnostics: [{ code: APPLY_FAILED, message: _message }] };
  }

  function buildPlaceOptions(_payload, _reason) {
    return {
      guard: { kind: "tabMutationRunId", runId: _payload.runId },
      reason: _reason,
      source: "tabsMutation",
      skipHistory: true,
      isHistoryReplay: true,
      restorePayload: { source: "tabsMutation", skipHistory: true, runId: _payload.runId }
    };
  }

  function rebuildDestination(_context, _plan, _tabId, _rows, _parked, _placeOptions, _runId) {
    return _placeEntries.rebuildSlotFromEntries(_context, _tabId, _rows, { plan: _plan, parked: _parked, placeOptions: _placeOptions, runId: _runId });
  }

  function recordCreated(_snapshot, _created) {
    if (!_snapshot.createdWidgetIds) { _snapshot.createdWidgetIds = []; }
    (_created || []).forEach(function (entry) {
      if (entry && entry.widgetId) { _snapshot.createdWidgetIds.push(entry.widgetId); }
    });
  }

  function isSlotMoveFrom(_plan, _tabId) {
    return (_plan.slotMoves || []).some(function (move) { return move.fromTabId === _tabId; });
  }

  function findSerializedRow(_serialized, _sourceWidgetId) {
    for (var index = 0; index < _serialized.length; index += 1) {
      if (_serialized[index] && _serialized[index].sourceWidgetId === _sourceWidgetId) { return _serialized[index]; }
    }
    return null;
  }

  function dispatchOwner(_context, _owner, _type, _payload, _runId) {
    var api = _context._KDB.api && _context._KDB.api[_owner];
    if (!api || typeof api.dispatch !== "function") { return Promise.resolve(null); }
    return Promise.resolve(api.dispatch({
      type: _type,
      payload: Object.assign({}, _payload, { source: "tabsMutation", runId: _runId, skipHistory: true })
    }));
  }

  function collectDegraded(_degraded, _result, _phaseMessage) {
    if (_result && _result.ok === true && _result.degraded !== true) { return; }
    var diag = _result && Array.isArray(_result.diagnostics) && _result.diagnostics[0];
    _degraded.push({
      sourceWidgetId: null,
      code: diag && diag.code ? diag.code : FILL_FAILED,
      message: diag && diag.message ? _phaseMessage + ": " + diag.message : _phaseMessage
    });
  }

  // Restores settings, text and vis bindings of the created widgets from their serialized rows.
  // Failures become degraded entries; the rebuilt shells stay.
  async function fillDuplicateWidgetContent(_context, _created, _serializedEntries) {
    var degraded = [];
    try {
      var widgets = [];
      var widgetCorrelation = {};
      var serialized = Array.isArray(_serializedEntries) ? _serializedEntries : [];
      (Array.isArray(_created) ? _created : []).forEach(function (entry) {
        var row = findSerializedRow(serialized, entry.sourceWidgetId);
        if (!row || !row.entry) { return; }
        widgetCorrelation[String(widgets.length)] = { widgetId: entry.widgetId, kind: row.entry.kind, tabIdx: row.entry.tab };
        widgets.push(row.entry);
      });
      if (widgets.length === 0) { return { degraded: degraded }; }
      // Reusing the canonical parameterSet allocator keeps every owner's parameterSetRunId guard monotone with real restore runs.
      var runtime = _ensureWritebackRuntime(_context._KDB);
      runtime.parameterSetRestoreRunId += 1;
      var fillRunId = runtime.parameterSetRestoreRunId;
      var batch = { widgets: widgets, widgetCorrelation: widgetCorrelation };
      var settingsResult = await dispatchOwner(_context, "widgetSettings", _settingsActionTypes.PARAMETER_SET_RESTORE_BATCH, batch, fillRunId);
      collectDegraded(degraded, settingsResult, "duplicate widgetSettings restore batch failed");
      if (widgets.some(function (entry) { return entry && entry.kind === "txt"; })) {
        var textResult = await dispatchOwner(_context, "widgetText", _textActionTypes.PARAMETER_SET_RESTORE, batch, fillRunId);
        collectDegraded(degraded, textResult, "duplicate widgetText restore failed");
      }
      if (widgets.some(function (entry) { return entry && entry.kind === "vis"; })) {
        var visResult = await dispatchOwner(_context, "widgetVis", _visActionTypes.PARAMETER_SET_BINDING, { widgetCorrelation: widgetCorrelation }, fillRunId);
        collectDegraded(degraded, visResult, "duplicate widgetVis binding failed");
      }
    } catch (err) {
      degraded.push({ sourceWidgetId: null, code: FILL_FAILED, message: "duplicate content fill threw: " + String(err && err.message ? err.message : err) });
    }
    return { degraded: degraded };
  }

  // Rebuilds every snapshot.rebuildByTabId destination in key order and fills the created widgets' content.
  // Returns a fail result on the first structural, superseded or stale slot; null when all slots are rebuilt.
  async function rebuildTabs(_context, _payload, _plan, _snapshot, _state, _options) {
    var rebuildMap = _snapshot.rebuildByTabId || {};
    var keys = Object.keys(rebuildMap);
    for (var index = 0; index < keys.length; index += 1) {
      var tabId = keys[index];
      var rows = Array.isArray(rebuildMap[tabId]) ? rebuildMap[tabId] : [];
      if (tabId === _options.skipTabId || (_options.skipEmpty && rows.length === 0 && !isSlotMoveFrom(_plan, tabId))) {
        continue;
      }
      var slotResult = await rebuildDestination(_context, _plan, tabId, rows, _state.parked, _options.placeOptions, _payload.runId);
      recordCreated(_snapshot, slotResult && slotResult.created);
      if (!slotResult || slotResult.ok !== true || slotResult.structural || slotResult.superseded) {
        return failApply(_state.parked, _state.moved, slotResult && slotResult.message ? slotResult.message : _options.messages.failed);
      }
      _state.created = _state.created.concat(slotResult.created || []);
      _state.degradedEntries = _state.degradedEntries.concat(slotResult.degradedEntries || []);
      if (slotResult.created && slotResult.created.length > 0) {
        if (_guard.isStale(_context._KDB, _payload.runId)) {
          return failApply(_state.parked, _state.moved, _options.messages.superseded);
        }
        var fillResult = await fillDuplicateWidgetContent(_context, slotResult.created, rows);
        _state.degradedEntries = _state.degradedEntries.concat(fillResult && fillResult.degraded || []);
      }
    }
    return null;
  }

  async function applySlotStock(_context, _payload, _plan, _snapshot, _parked, _moved, _variant) {
    var variant = VARIANTS[_variant];
    if (_variant === "duplicate") {
      if (!_plan.insertSlot || !_plan.insertSlot.tabId) {
        return failApply(_parked, _moved, "duplicate plan missing insertSlot.tabId");
      }
      if (!_snapshot.rebuildByTabId || typeof _snapshot.rebuildByTabId !== "object") {
        return failApply(_parked, _moved, "duplicate prepare snapshot missing rebuildByTabId");
      }
    }
    var placeOptions = buildPlaceOptions(_payload, variant.reason);
    var hideTabId = variant.parkHideSlot ? _plan.hideSlot && _plan.hideSlot.tabId : null;
    if (hideTabId) {
      var hideResult = await rebuildDestination(_context, _plan, hideTabId, [], _parked, placeOptions, _payload.runId);
      if (!hideResult || hideResult.ok !== true) {
        return failApply(_parked, _moved, hideResult && hideResult.message ? hideResult.message : "widget rebuild failed to park the hidden slot.");
      }
    }
    var state = { parked: _parked, moved: _moved, created: [], degradedEntries: [] };
    var failed = await rebuildTabs(_context, _payload, _plan, _snapshot, state, {
      placeOptions: placeOptions,
      skipTabId: hideTabId,
      skipEmpty: variant.skipEmpty === true,
      messages: variant.messages
    });
    if (failed) { return failed; }
    return {
      ok: true, operationId: _payload.operationId, moved: _moved, parked: _parked,
      created: state.created, degradedEntries: state.degradedEntries, diagnostics: []
    };
  }

  async function handleApplyTabMutation(_context, _action) {
    var moved = [];
    var parked = [];
    try {
      var payload = _action && _action.payload || {};
      var guard = _guard.guardRun(_context._KDB, payload);
      if (guard) { return guard; }
      var plan = payload.plan || {};
      if (!Object.prototype.hasOwnProperty.call(VARIANTS, plan.operation)) {
        return failApply(parked, moved, "widgetBase tab mutation apply supports delete, move, duplicate, and restoreDeleted.");
      }
      var snapshot = _guard.readSnapshot(_context._KDB, payload.operationId);
      if (snapshot) { snapshot.physicalStarted = true; }
      return await applySlotStock(_context, payload, plan, snapshot || {}, parked, moved, plan.operation);
    } catch (err) {
      return failApply(parked, moved, String(err && err.message ? err.message : err));
    }
  }

  return {
    handleApplyTabMutation: handleApplyTabMutation,
    rebuildDestination: rebuildDestination,
    buildPlaceOptions: buildPlaceOptions,
    recordCreated: recordCreated
  };
});
