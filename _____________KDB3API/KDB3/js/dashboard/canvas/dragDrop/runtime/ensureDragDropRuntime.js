define([], function () {
  "use strict";
  function ensureDragDropRuntime(_KDB) {
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
    return _KDB.runtime.dragDrop;
  }
  return ensureDragDropRuntime;
});
