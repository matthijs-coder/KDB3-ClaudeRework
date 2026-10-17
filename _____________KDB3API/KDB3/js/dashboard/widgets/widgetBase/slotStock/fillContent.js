define([
  "../../widgetSettings/selectors.js",
  "../../widgetText/selectors.js",
  "../../widgetVis/selectors.js"
], function (_settingsSelectors, _textSelectors, _visSelectors) {
  "use strict";

  var FILL_FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";

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
      var writebackSet = _context._KDB.services && _context._KDB.services.writebackSet;
      if (!writebackSet || typeof writebackSet.allocateRestoreRunId !== "function") {
        degraded.push({ sourceWidgetId: null, code: FILL_FAILED, message: "duplicate content fill skipped: writebackSet service unavailable" });
        return { degraded: degraded };
      }
      var fillRunId = writebackSet.allocateRestoreRunId();
      var batch = { widgets: widgets, widgetCorrelation: widgetCorrelation };
      var settingsResult = await dispatchOwner(_context, "widgetSettings", _settingsSelectors.ACTION_TYPES.PARAMETER_SET_RESTORE_BATCH, batch, fillRunId);
      collectDegraded(degraded, settingsResult, "duplicate widgetSettings restore batch failed");
      if (widgets.some(function (entry) { return entry && entry.kind === "txt"; })) {
        var textResult = await dispatchOwner(_context, "widgetText", _textSelectors.ACTION_TYPES.PARAMETER_SET_RESTORE, batch, fillRunId);
        collectDegraded(degraded, textResult, "duplicate widgetText restore failed");
      }
      if (widgets.some(function (entry) { return entry && entry.kind === "vis"; })) {
        var visResult = await dispatchOwner(_context, "widgetVis", _visSelectors.ACTION_TYPES.PARAMETER_SET_BINDING, { widgetCorrelation: widgetCorrelation }, fillRunId);
        collectDegraded(degraded, visResult, "duplicate widgetVis binding failed");
      }
    } catch (err) {
      degraded.push({ sourceWidgetId: null, code: FILL_FAILED, message: "duplicate content fill threw: " + String(err && err.message ? err.message : err) });
    }
    return { degraded: degraded };
  }

  return { fillDuplicateWidgetContent: fillDuplicateWidgetContent };
});
