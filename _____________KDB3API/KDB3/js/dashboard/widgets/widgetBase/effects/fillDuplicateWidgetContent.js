define([
  "../../widgetSettings/config/actionTypes.js",
  "../../widgetText/config/actionTypes.js",
  "../../widgetVis/config/actionTypes.js",
  "../../../../core/services/writeback/set/state/ensureWritebackRuntime.js"
], function (_settingsActionTypes, _textActionTypes, _visActionTypes, _ensureWritebackRuntime) {
  "use strict";

  var FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";

  async function fillDuplicateWidgetContent(_context, _created, _serializedEntries) {
    var degraded = [];
    try {
      var widgets = [];
      var widgetCorrelation = {};
      var created = Array.isArray(_created) ? _created : [];
      var serialized = Array.isArray(_serializedEntries) ? _serializedEntries : [];
      for (var i = 0; i < created.length; i += 1) {
        var row = findSerializedRow(serialized, created[i].sourceWidgetId);
        if (!row || !row.entry) { continue; }
        widgetCorrelation[String(widgets.length)] = { widgetId: created[i].widgetId, kind: row.entry.kind, tabIdx: row.entry.tab };
        widgets.push(row.entry);
      }
      if (widgets.length === 0) { return { degraded: degraded }; }
      // Reusing the canonical parameterSet allocator keeps every owner's
      // parameterSetRunId guard monotone with real restore runs.
      var runtime = _ensureWritebackRuntime(_context._KDB);
      runtime.parameterSetRestoreRunId += 1;
      var fillRunId = runtime.parameterSetRestoreRunId;
      var settingsResult = await dispatchOwner(_context, "widgetSettings", _settingsActionTypes.PARAMETER_SET_RESTORE_BATCH,
        { widgets: widgets, widgetCorrelation: widgetCorrelation }, fillRunId);
      collectDegraded(degraded, settingsResult, "duplicate widgetSettings restore batch failed");
      if (hasKind(widgets, "txt")) {
        var textResult = await dispatchOwner(_context, "widgetText", _textActionTypes.PARAMETER_SET_RESTORE,
          { widgets: widgets, widgetCorrelation: widgetCorrelation }, fillRunId);
        collectDegraded(degraded, textResult, "duplicate widgetText restore failed");
      }
      if (hasKind(widgets, "vis")) {
        var visResult = await dispatchOwner(_context, "widgetVis", _visActionTypes.PARAMETER_SET_BINDING,
          { widgetCorrelation: widgetCorrelation }, fillRunId);
        collectDegraded(degraded, visResult, "duplicate widgetVis binding failed");
      }
    } catch (err) {
      degraded.push({
        sourceWidgetId: null,
        code: FAILED,
        message: "duplicate content fill threw: " + String(err && err.message ? err.message : err)
      });
    }
    return { degraded: degraded };
  }

  function findSerializedRow(serialized, sourceWidgetId) {
    for (var i = 0; i < serialized.length; i += 1) {
      if (serialized[i] && serialized[i].sourceWidgetId === sourceWidgetId) { return serialized[i]; }
    }
    return null;
  }

  function hasKind(widgets, kind) {
    return widgets.some(function (entry) { return entry && entry.kind === kind; });
  }

  function dispatchOwner(_context, owner, type, payload, runId) {
    var api = _context._KDB.api && _context._KDB.api[owner];
    if (!api || typeof api.dispatch !== "function") { return Promise.resolve(null); }
    return Promise.resolve(api.dispatch({
      type: type,
      payload: Object.assign({}, payload, { source: "tabsMutation", runId: runId, skipHistory: true })
    }));
  }

  function collectDegraded(degraded, result, phaseMessage) {
    if (result && result.ok === true && result.degraded !== true) { return; }
    var diag = result && Array.isArray(result.diagnostics) && result.diagnostics[0];
    degraded.push({
      sourceWidgetId: null,
      code: diag && diag.code ? diag.code : FAILED,
      message: diag && diag.message ? phaseMessage + ": " + diag.message : phaseMessage
    });
  }

  return fillDuplicateWidgetContent;
});
