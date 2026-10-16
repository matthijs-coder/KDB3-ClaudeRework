define([
  "./state/createDragDropReducer.js",
  "./state/selectors.js",
  "./session/startDragSession.js",
  "./runtime/ensureDragDropRuntime.js",
  "./effects/mountDragDropController.js",
  "./effects/destroyDragDropController.js"
], function (_createDragDropReducer, _selectors, _startDragSession, _ensureDragDropRuntime, _mountDragDropController, _destroyDragDropController) {
  "use strict";
  function createDragDropController(_deps) {
    const controller = {
      _KDB: _deps._KDB,
      options: _deps.options || {},
      reducer: _createDragDropReducer(),
      isDisposed: false,
      didWarnDisposed: false
    };
    return { destroy: _destroyDragDropController.bind(null, controller), finishDrag: finishDrag.bind(null, controller), getState: getState.bind(null, controller), mount: _mountDragDropController.mount.bind(null, controller), refreshDropboxes: _mountDragDropController.refreshDropboxes.bind(null, controller), startDrag: startDrag.bind(null, controller) };
  }
  function startDrag(controller, _event, _sourceInfo) {
    if (controller.isDisposed) {
      warnDisposed(controller, "startDrag");
      return false;
    }
    try {
      return _startDragSession(controller._KDB, _event, _sourceInfo, _ensureDragDropRuntime(controller._KDB), dispatchInternal.bind(null, controller));
    } catch (error) {
      return handleBoundaryError(controller, "startDrag", error);
    }
  }
  function finishDrag(controller, _event) {
    if (controller.isDisposed) {
      warnDisposed(controller, "finishDrag");
      return false;
    }
    return _mountDragDropController.completeDrop(controller, _event);
  }
  function getState(controller) {
    if (controller.isDisposed) {
      return undefined;
    }
    return _selectors.readDragDropState(controller._KDB);
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
  return createDragDropController;
});

