/*
 * Shared event family of the filter owners (singleSelect and nativeMultiSelect emit, widgetVis subscribes), so it
 * lives in core/events. Other modules import this file, never an owner's files.
 *
 *   CONFIRMED = "filters:confirmed"   A filter commit or history replay was confirmed on the host.
 *     payload { filterType, scopeType, tabId?, scopeId?, columnId?, confirmedValues? }
 *       filterType        "singleSelect" | "nativeMultiSelect"
 *       scopeType         "global" | "pageContext"
 *       tabId, scopeId    only the keys the filter knows
 *       columnId          the confirmed column id, only when the filter reports it
 *       confirmedValues   the confirmed [{ d, u }] values, only when the filter reports them
 *     The bus emits synchronously: subscribers run at the call position of the emitter and cannot fail the commit.
 *     widgetVis starts the TopN wave from it (widgetVis/topN/filtersConfirmed.js).
 *
 * emitConfirmed(_KDB, payload)       Emits CONFIRMED; no-op while _KDB.events is missing.
 */
define([], function () {
  "use strict";

  var CONFIRMED = "filters:confirmed";

  function emitConfirmed(_KDB, _payload) {
    if (_KDB && _KDB.events && typeof _KDB.events.emit === "function") {
      _KDB.events.emit(CONFIRMED, _payload);
    }
  }

  return { CONFIRMED: CONFIRMED, emitConfirmed: emitConfirmed };
});
