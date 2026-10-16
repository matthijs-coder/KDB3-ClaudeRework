define([
  "../config/selectors.js",
  "../state/selectionState.js"
], function (_selectors, _selectionState) {
  "use strict";

  function onOutClickRevert(_runtime, _filterState, _listenerKey) {
    delete _runtime.listeners[_listenerKey];
    if (_filterState.isCommitInProgress !== true) {
      _filterState.pendingSelection = _selectionState.createPendingSelection(
        _selectionState.getConfirmedDisplayValue(_filterState.backupSelection)
      );
    }
  }

  function __controller(_runtime, _filterState) {
    var catcher = document.querySelector(_selectors.outClickCatcherSelector);
    var listenerKey = "outClick_" + (_filterState.filterKey || "default");
    var handler;
    if (!catcher || _runtime.listeners[listenerKey]) {
      return;
    }
    handler = onOutClickRevert.bind(null, _runtime, _filterState, listenerKey);
    catcher.addEventListener("click", handler, { once: true });
    _runtime.listeners[listenerKey] = function cleanupOutClickListener() {
      catcher.removeEventListener("click", handler);
      delete _runtime.listeners[listenerKey];
    };
  }

  return __controller;
});
