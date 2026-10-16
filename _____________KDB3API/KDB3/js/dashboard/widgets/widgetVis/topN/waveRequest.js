/*
 * waveRequest.js: turns a `filters:confirmed` event payload into the request of runTopNFilterConfirmWave.
 * The filters only report facts (column, confirmed values); the Jahr decision and the year parsing live here.
 *
 *   buildWavePayload(event) -> { scopeType, tabId?, scopeId?, isJahr, selectedYearKnown?, selectedYear?, filterType }
 *     tabId / scopeId are passed through only when the event carries the key.
 *     isJahr is true only for a string columnId equal to the TopN helper table's jahrColumnId.
 *     selectedYearKnown / selectedYear are set only when the event carries confirmedValues.
 */
define([
  "./periodPin.js",
  "../../../../core/config/visualizations/topNHelper.js"
], function (_periodPin, _topNHelper) {
  "use strict";

  function hasKey(_source, _key) {
    return Object.prototype.hasOwnProperty.call(_source, _key);
  }

  function isJahrColumn(_columnId) {
    var table;
    if (typeof _columnId !== "string") {
      return false;
    }
    table = _topNHelper.resolveTableEntry();
    return !!(table && _columnId === table.jahrColumnId);
  }

  function buildWavePayload(_event) {
    var event = _event || {};
    var payload = { scopeType: event.scopeType };
    var isJahr;
    if (hasKey(event, "tabId")) {
      payload.tabId = event.tabId;
    }
    if (hasKey(event, "scopeId")) {
      payload.scopeId = event.scopeId;
    }
    isJahr = isJahrColumn(event.columnId);
    payload.isJahr = isJahr;
    if (Array.isArray(event.confirmedValues)) {
      payload.selectedYearKnown = isJahr;
      payload.selectedYear = isJahr ? _periodPin.readConfirmedJahrYear(event.confirmedValues) : null;
    }
    payload.filterType = event.filterType;
    return payload;
  }

  return { buildWavePayload: buildWavePayload };
});
