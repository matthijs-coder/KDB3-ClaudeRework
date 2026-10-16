define([
  "../../render/postRender.js",
  "../../runtime.js",
  "./normalizeDecorationCleanupOutcome.js"
], function (_postRender, _visRuntime, _normalizeDecorationCleanupOutcome) {
  "use strict";

  function runDecorationCleanup(_context, _widgetId, _opSeq, _payload, _bindingResult) {
    return Promise.resolve(_postRender.cleanupVisualizationContent(_context._KDB, {
      widgetId: _widgetId,
      opSeq: _opSeq,
      payload: _payload,
      runtime: _visRuntime.ensureWidgetRuntime(_context._KDB, _widgetId),
      isStaleOpSeq: _context.isStaleOpSeq.bind(_context)
    })).then(function (cleanupResult) {
      return _normalizeDecorationCleanupOutcome(
        _context,
        _widgetId,
        _opSeq,
        _payload,
        cleanupResult,
        _bindingResult
      );
    });
  }

  return runDecorationCleanup;
});
