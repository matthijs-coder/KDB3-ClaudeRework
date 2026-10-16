/*
 * filtersConfirmed.js: starts the TopN wave when a filter owner confirms a value (`filters:confirmed`).
 * The wave is fire-and-forget, as it was when the filters called it directly: the result is not awaited and a
 * failure is logged without touching the filter commit that emitted the event.
 *
 *   subscribe(_KDB) -> unsubscribe | null   Idempotent; the unsubscribe lives in runtime.subscriptions.filtersConfirmed
 *                                           and is released by disposeModuleRuntime. null while _KDB.events is missing.
 */
define([
  "./wave.js",
  "./waveRequest.js",
  "../runtime.js",
  "../../../../core/events/filters.js"
], function (_wave, _waveRequest, _visRuntime, _filterEvents) {
  "use strict";

  function logWaveFailure(_err) {
    console.error("[widgetVis.filtersConfirmed] topN wave failed", _err);
  }

  function onFiltersConfirmed(_KDB, _event) {
    try {
      Promise.resolve(_wave.runTopNFilterConfirmWave(_KDB, _waveRequest.buildWavePayload(_event))).then(null, logWaveFailure);
    } catch (err) {
      logWaveFailure(err);
    }
  }

  function subscribe(_KDB) {
    var subscriptions = _visRuntime.initializeRuntime(_KDB).subscriptions;
    if (!_KDB.events || typeof _KDB.events.subscribe !== "function") {
      return null;
    }
    if (typeof subscriptions.filtersConfirmed !== "function") {
      subscriptions.filtersConfirmed = _KDB.events.subscribe(_filterEvents.CONFIRMED, onFiltersConfirmed.bind(null, _KDB));
    }
    return subscriptions.filtersConfirmed;
  }

  return { subscribe: subscribe };
});
