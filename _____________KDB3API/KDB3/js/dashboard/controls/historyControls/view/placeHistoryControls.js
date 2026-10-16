define(["./buildHistoryControls.js"], function (_buildHistoryControls) {
  "use strict";

  function __controller(_KDB, _toolbarHostEl) {
    var selectors;
    var runtime;
    var rootEl;
    var undoButtonEl;
    var redoButtonEl;

    if (!_KDB || !_toolbarHostEl) {
      return null;
    }

    selectors = _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.historyControls;
    runtime = _KDB.runtime && _KDB.runtime.historyControls;
    if (!selectors || !runtime) {
      return null;
    }

    rootEl = _toolbarHostEl.querySelector(selectors.rootSelector);
    if (!rootEl) {
      rootEl = _buildHistoryControls(_KDB);
      _toolbarHostEl.insertBefore(rootEl, _toolbarHostEl.firstChild || null);
    }

    undoButtonEl = rootEl.querySelector(selectors.undoButtonSelector);
    redoButtonEl = rootEl.querySelector(selectors.redoButtonSelector);
    runtime.domRefs.toolbarHostEl = _toolbarHostEl;
    runtime.domRefs.rootEl = rootEl;
    runtime.domRefs.undoButtonEl = undoButtonEl;
    runtime.domRefs.redoButtonEl = redoButtonEl;
    return rootEl;
  }

  return __controller;
});
