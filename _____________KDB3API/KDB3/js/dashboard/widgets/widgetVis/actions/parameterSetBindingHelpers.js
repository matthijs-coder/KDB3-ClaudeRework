define([], function () {
  "use strict";

  function collectVisWidgets(_correlation) {
    if (!_correlation || typeof _correlation !== "object") {
      return [];
    }
    var byWidget = {};
    Object.keys(_correlation).sort().forEach(function (entryIndex) {
      var entry = _correlation[entryIndex];
      if (entry && entry.kind === "vis" && entry.widgetId) {
        byWidget[entry.widgetId] = true;
      }
    });
    return Object.keys(byWidget);
  }

  function readCommittedSettings(_KDB, _widgetId) {
    var api = _KDB && _KDB.api ? _KDB.api.widgetSettings : null;
    var state = api && typeof api.getState === "function" ? api.getState() : null;
    var record = state && state.byWidget ? state.byWidget[_widgetId] : null;
    if (!record) {
      return null;
    }
    var settings = { dimension: record.dimension, visType: record.visType, topNChoice: record.topNChoice };
    if (typeof record.showValues === "boolean") {
      settings.showValues = record.showValues;
    }
    if (typeof record.iterator === "boolean") {
      settings.iterator = record.iterator;
    }
    if (typeof record.zoom === "boolean") {
      settings.zoom = record.zoom;
    }
    if (typeof record.valueCaption === "boolean") {
      settings.valueCaption = record.valueCaption;
    }
    if (record.grouping === "stichtag" || record.grouping === "jahr" || record.grouping === "jahrStichtag" || record.grouping === "stichtagProJahrH" || record.grouping === "stichtagProJahrV") {
      settings.grouping = record.grouping;
    }
    return settings;
  }

  function isDegradedFailure(_result) {
    var code = _result && _result.errorCode ? _result.errorCode : "";
    return (_result && _result.status === "timeout")
      || code === "WIDGET_VIS_CONTENT_READY_TIMEOUT"
      || code === "WIDGET_VIS_BINDING_PREREQUISITE_TIMEOUT"
      || code === "WIDGET_VIS_BINDING_TIMEOUT"
      || code === "WIDGET_VIS_TOPN_UNAVAILABLE";
  }

  function cancelledResult(_runId, _latestRunId, _diagnostics, _bound, _skipped) {
    _diagnostics.push({ code: "WRITEBACK_RESTORE_CANCELLED", message: "stale parameterSet runId " + _runId + " superseded by " + _latestRunId });
    return { ok: false, status: "cancelled", bound: _bound || [], skipped: _skipped || [], diagnostics: _diagnostics };
  }

  function failedResult(_code, _message) {
    return { ok: false, bound: [], skipped: [], diagnostics: [{ code: _code, message: _message }] };
  }

  return {
    collectVisWidgets: collectVisWidgets,
    readCommittedSettings: readCommittedSettings,
    isDegradedFailure: isDegradedFailure,
    cancelledResult: cancelledResult,
    failedResult: failedResult
  };
});
