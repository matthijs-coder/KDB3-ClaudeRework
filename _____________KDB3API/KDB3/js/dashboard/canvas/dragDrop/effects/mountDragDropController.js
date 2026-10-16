define([
  "../avatar/createDragAvatarTemplates.js",
  "../dropboxes/bindDropboxes.js",
  "../dropboxes/subscribeTabsChangedRebind.js",
  "../runtime/ensureDragDropRuntime.js",
  "../session/finishDragSession.js"
], function (_createDragAvatarTemplates, _bindDropboxes, _subscribeTabsChangedRebind, _ensureDragDropRuntime, _finishDragSession) {
  "use strict";
  function mountDragDropController(controller, _options) {
    if (controller.isDisposed) {
      warnDisposed(controller, "mount");
      return false;
    }
    try {
      const _KDB = controller._KDB;
      const runtime = _ensureDragDropRuntime(_KDB);
      _createDragAvatarTemplates(_KDB, runtime);
      _bindDropboxes(_KDB, runtime, dispatchInternal.bind(null, controller), completeDrop.bind(null, controller));
      _subscribeTabsChangedRebind.register(_KDB, refreshDropboxes.bind(null, controller));
      dispatchInternal(controller, { type: "dragDrop/mountSucceeded", payload: { mountedAt: Date.now(), options: _options || {} } });
      return true;
    } catch (error) {
      return handleBoundaryError(controller, "mount", error);
    }
  }
  function refreshDropboxes(controller) {
    if (controller.isDisposed) {
      warnDisposed(controller, "refreshDropboxes");
      return false;
    }
    try {
      return _bindDropboxes(controller._KDB, _ensureDragDropRuntime(controller._KDB), dispatchInternal.bind(null, controller), completeDrop.bind(null, controller));
    } catch (error) {
      return handleBoundaryError(controller, "refreshDropboxes", error);
    }
  }
  function completeDrop(controller, _event) {
    try {
      const didCleanup = _finishDragSession(controller._KDB, _event, _ensureDragDropRuntime(controller._KDB));
      dispatchInternal(controller, { type: "dragDrop/dragFinished" });
      return didCleanup;
    } catch (error) {
      return handleBoundaryError(controller, "finishDrag", error);
    }
  }
  function dispatchInternal(controller, _action) {
    const _KDB = controller._KDB;
    _KDB.state.dragDrop = controller.reducer(_KDB.state.dragDrop, _action);
  }
  function warnDisposed(controller, methodName) {
    if (controller.didWarnDisposed) {
      return;
    }
    controller.didWarnDisposed = true;
    console.warn("[dragDrop." + methodName + "] called after destroy");
  }
  function handleBoundaryError(controller, methodName, error) {
    console.error("[dragDrop." + methodName + "] failed", error);
    dispatchInternal(controller, {
      type: "dragDrop/error",
      payload: { errorCode: "DRAG_DROP_" + methodName.toUpperCase() + "_FAILED", errorMessage: toErrorMessage(error) }
    });
    return false;
  }
  function toErrorMessage(error) {
    return error && error.message ? error.message : String(error);
  }
  return { mount: mountDragDropController, refreshDropboxes: refreshDropboxes, completeDrop: completeDrop };
});
