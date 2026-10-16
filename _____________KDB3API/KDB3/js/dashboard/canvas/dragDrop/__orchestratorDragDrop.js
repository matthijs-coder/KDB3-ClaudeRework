define([
  "./state/initialState.js",
  "./createDragDropController.js"
], function (_initialState, _createDragDropController) {
  "use strict";

  // Lifecycle terms for dragDrop: idle, ready, error, disposed.
  function __orchestrator(_KDB, _options) {
    ensureNamespaces(_KDB);
    if (!_KDB.state.dragDrop) {
      _KDB.state.dragDrop = _initialState();
    }
    ensureRuntime(_KDB);
    _KDB.api.dragDrop = _createDragDropController({
      _KDB: _KDB,
      options: _options || {}
    });
    return _KDB.api.dragDrop;
  }

  function ensureNamespaces(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
  }

  function ensureRuntime(_KDB) {
    _KDB.runtime.dragDrop = _KDB.runtime.dragDrop || {};
    _KDB.runtime.dragDrop.domRefs = _KDB.runtime.dragDrop.domRefs || {};
    _KDB.runtime.dragDrop.listeners = _KDB.runtime.dragDrop.listeners || {};
    _KDB.runtime.dragDrop.listeners.dropboxes = _KDB.runtime.dragDrop.listeners.dropboxes || [];
    _KDB.runtime.dragDrop.subscriptions = _KDB.runtime.dragDrop.subscriptions || {};
    _KDB.runtime.dragDrop.abortControllers = _KDB.runtime.dragDrop.abortControllers || {};
    _KDB.runtime.dragDrop.observers = _KDB.runtime.dragDrop.observers || {};
    _KDB.runtime.dragDrop.timers = _KDB.runtime.dragDrop.timers || {};
    _KDB.runtime.dragDrop.pendingPromises = _KDB.runtime.dragDrop.pendingPromises || {};
    _KDB.runtime.dragDrop.dropboxesById = _KDB.runtime.dragDrop.dropboxesById || {};
    _KDB.runtime.dragDrop.sourceRuntime = _KDB.runtime.dragDrop.sourceRuntime || null;
  }

  return __orchestrator;
});
