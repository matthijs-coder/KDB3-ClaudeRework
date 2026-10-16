define([
  "../effects/widgetFocusMode.js"
], function (_widgetFocusMode) {
  "use strict";

  function focusModeReadMaximized(_context, _widgetId) {
    return _context.selectors.readVisMaximized(_context._KDB, _widgetId);
  }

  function focusModeOnEntered(_context, _widgetId, _source) {
    if (_context.selectors.readVisMaximized(_context._KDB, _widgetId) === true) {
      return;
    }
    _context.dispatchInternal({
      type: _context.actionTypes.MAXIMIZE_SUCCEEDED,
      widgetId: _widgetId,
      payload: { nextMaximized: true, source: _source || "nativeExpand" }
    });
  }

  function focusModeOnExited(_context, _widgetId, _source) {
    if (_context.selectors.readVisMaximized(_context._KDB, _widgetId) !== true) {
      return;
    }
    _context.dispatchInternal({
      type: _context.actionTypes.MAXIMIZE_SUCCEEDED,
      widgetId: _widgetId,
      payload: { nextMaximized: false, source: _source || "nativeCollapse" }
    });
  }

  function buildFocusModeCallbacks(_context, _widgetId) {
    return {
      readMaximized: focusModeReadMaximized.bind(null, _context, _widgetId),
      onEntered: focusModeOnEntered.bind(null, _context, _widgetId),
      onExited: focusModeOnExited.bind(null, _context, _widgetId)
    };
  }

  function ensureFocusObserver(_context, _widgetId, _runtime) {
    return _widgetFocusMode.installFocusModeObserver(
      _context._KDB,
      _widgetId,
      _runtime,
      buildFocusModeCallbacks(_context, _widgetId)
    );
  }

  return ensureFocusObserver;
});
