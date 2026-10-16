define([
  "./runBindingPipeline.js",
  "./applyTopNJahrMismatchPin.js",
  "../runtime.js"
], function (_runBindingPipeline, _applyTopNJahrMismatchPin, _visRuntime) {
  "use strict";

  function __controller(_KDB, _context, _widgetIds, _payload) {
    var waveId = beginWave(_KDB);
    return readPin(_KDB, _payload).then(fanOut.bind(null, _KDB, _context, _widgetIds, _payload, waveId), logPin.bind(null, _KDB, waveId));
  }

  function readPin(_KDB, _payload) {
    return _applyTopNJahrMismatchPin(_KDB, null, _payload || {});
  }

  function fanOut(_KDB, _context, _widgetIds, _payload, _waveId, _pin) {
    if (!isCurrent(_KDB, _waveId)) {
      return { ok: false, cancelled: true };
    }
    return runSerial(_KDB, _context, _widgetIds, _pin, _payload, _waveId);
  }

  function logPin(_KDB, _waveId, _err) {
    console.error("[widgetVis.runTopNWaveFanOut] pin failed", _err);
    if (!isCurrent(_KDB, _waveId)) {
      return { ok: false, cancelled: true };
    }
    return { ok: false, errorCode: _err && _err.errorCode };
  }

  async function runSerial(_KDB, _context, _widgetIds, _pin, _payload, _waveId) {
    var index = 0;
    while (index < _widgetIds.length) {
      if (!isCurrent(_KDB, _waveId)) {
        return { ok: false, cancelled: true };
      }
      await runOne(_context, _widgetIds[index], _pin, _payload);
      await releaseClaim(_KDB, _widgetIds[index]);
      index += 1;
    }
    return { ok: true };
  }

  function runOne(_context, _widgetId, _pin, _payload) {
    return Promise.resolve(_runBindingPipeline(_context, {
      widgetId: _widgetId,
      reason: "topN",
      metric: _context.readMetric(_widgetId),
      settings: _context.readSettingsSnapshot(_widgetId, _payload),
      payload: { source: "topNFilterWave", isHistoryReplay: false },
      periodPin: _pin
    })).then(null, logWidget.bind(null, _widgetId));
  }

  function logWidget(_widgetId, _err) {
    console.error("[widgetVis.runTopNWaveFanOut] widget failed", { widgetId: _widgetId }, _err);
  }

  function releaseClaim(_KDB, _widgetId) {
    var api = _KDB.api && _KDB.api.widgetTopN;
    if (!api || typeof api.dispatch !== "function") {
      return Promise.resolve();
    }
    return Promise.resolve(api.dispatch({
      type: "widgetTopN/cleanup",
      widgetId: _widgetId,
      payload: {
        ownerVisId: _widgetId,
        reason: "topNWaveRelease",
        clearHelperBinding: false,
        releaseClaim: true
      }
    })).then(null, logWidget.bind(null, _widgetId));
  }

  function beginWave(_KDB) {
    var runtime = _visRuntime.initializeRuntime(_KDB);
    runtime.pendingPromises.periodPinWave = (runtime.pendingPromises.periodPinWave || 0) + 1;
    return runtime.pendingPromises.periodPinWave;
  }

  function isCurrent(_KDB, _waveId) {
    return _visRuntime.initializeRuntime(_KDB).pendingPromises.periodPinWave === _waveId;
  }

  return __controller;
});
