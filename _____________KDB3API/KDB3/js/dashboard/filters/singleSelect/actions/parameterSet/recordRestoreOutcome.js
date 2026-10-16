define([], function () {
  "use strict";

  function skip(_result, _tab, _key, _code, _message, _hard, _inst) {
    var skipped = { key: _key, code: _code };
    if (_inst) { skipped.inst = _inst; }
    if (_tab !== undefined) { skipped.tab = _tab; }
    _result.skipped.push(skipped);
    _result.diagnostics.push({
      code: _code,
      key: _key || undefined,
      tab: _tab,
      message: _message
    });
    if (_hard === true) { _result.ok = false; } else { _result.degraded = true; }
    return false;
  }

  function hardSkipResult(_result, _code, _message) {
    _result.ok = false;
    _result.diagnostics.push({ code: _code, message: _message });
    return _result;
  }

  function cancelledMidRun(_result, _runId, _code) {
    _result.ok = false;
    _result.diagnostics.push({
      code: _code,
      message: "parameterSet runId " + _runId +
        " was superseded during restore; remaining entries not applied"
    });
    return _result;
  }

  return {
    skip: skip,
    hardSkipResult: hardSkipResult,
    cancelledMidRun: cancelledMidRun
  };
});
