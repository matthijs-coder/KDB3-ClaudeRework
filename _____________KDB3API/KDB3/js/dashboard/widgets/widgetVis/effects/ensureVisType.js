define([], function () {
  "use strict";

  function isAbortedOutcome(_outcome) {
    return !!(
      _outcome && (
        _outcome.outcome === "aborted" ||
        _outcome.aborted === true ||
        _outcome.reason === "aborted" ||
        _outcome.reason === "aborted-after-effect" ||
        _outcome.reason === "disposed"
      )
    );
  }

  function visTypesMatch(_current, _desired) {
    return String(_current == null ? "" : _current).toLowerCase() ===
      String(_desired == null ? "" : _desired).toLowerCase();
  }

  function ensureVisType(_visualizationFacet, _widgetId, _desiredVisType, _diagnostics, _signal) {
    var options = { signal: _signal };
    return Promise.resolve(_visualizationFacet.getVisType(_widgetId)).then(function (_readOutcome) {
      if (isAbortedOutcome(_readOutcome)) {
        return { ok: false, aborted: true };
      }
      if (!_readOutcome || _readOutcome.ok !== true) {
        _diagnostics.blockers = (_diagnostics.blockers || []).concat(["visualization.getVisType"]);
        return { ok: false, aborted: false };
      }
      _diagnostics.currentVisType = _readOutcome.data != null ? _readOutcome.data : null;
      _diagnostics.desiredVisType = _desiredVisType;
      if (_readOutcome.data === _desiredVisType) {
        _diagnostics.visTypeWriteNeeded = false;
        return { ok: true, aborted: false };
      }
      if (typeof _visualizationFacet.setVisType !== "function") {
        _diagnostics.blockers = (_diagnostics.blockers || []).concat(["visualization.setVisType"]);
        return { ok: false, aborted: false };
      }
      _diagnostics.visTypeWriteNeeded = true;
      return Promise.resolve(_visualizationFacet.setVisType(_widgetId, _desiredVisType, options)).then(function (_writeOutcome) {
        if (isAbortedOutcome(_writeOutcome)) {
          return { ok: false, aborted: true };
        }
        if (!_writeOutcome || _writeOutcome.ok !== true) {
          _diagnostics.blockers = (_diagnostics.blockers || []).concat(["visualization.setVisType"]);
          return { ok: false, aborted: false };
        }
        return { ok: true, aborted: false };
      });
    });
  }

  return ensureVisType;
});
