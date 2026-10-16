define(["../../../core/utils/kit/data.js"], function (_data) {
  "use strict";

  const ACTION_TYPES = {
    DRAG_FINISHED: "dragDrop/dragFinished",
    DRAG_STARTED: "dragDrop/dragStarted",
    DESTROY: "dragDrop/destroy",
    DROP_VALIDATED: "dragDrop/dropValidated",
    ERROR: "dragDrop/error",
    MOUNT_SUCCEEDED: "dragDrop/mountSucceeded"
  };

  function createInitialDragDropState() {
    return {
      lifecycle: "idle",
      isDragging: false,
      session: null,
      lastValidation: null,
      mountedAt: 0,
      errorCode: null,
      errorMessage: null
    };
  }

  function reduceDragDropState(state, action) {
    const current = state || {};
    const payload = action ? action.payload : undefined;

    switch (action ? action.type : undefined) {
      case ACTION_TYPES.MOUNT_SUCCEEDED:
        return patchState(current, {
          lifecycle: "ready",
          mountedAt: payload && payload.mountedAt ? payload.mountedAt : Date.now(),
          errorCode: null,
          errorMessage: null
        });
      case ACTION_TYPES.DRAG_STARTED:
        return patchState(current, {
          lifecycle: current.lifecycle === "disposed" ? "disposed" : "ready",
          isDragging: true,
          session: _data.cloneJson(payload || null),
          lastValidation: null,
          errorCode: null,
          errorMessage: null
        });
      case ACTION_TYPES.DROP_VALIDATED:
        return patchState(current, { lastValidation: buildLastValidation(payload || {}) });
      case ACTION_TYPES.DRAG_FINISHED:
        return patchState(current, {
          lifecycle: current.lifecycle === "disposed" ? "disposed" : "ready",
          isDragging: false,
          session: null
        });
      case ACTION_TYPES.ERROR:
        return patchState(current, {
          lifecycle: "error",
          isDragging: false,
          errorCode: (payload && payload.errorCode) || "DRAG_DROP_ERROR",
          errorMessage: (payload && payload.errorMessage) || null
        });
      case ACTION_TYPES.DESTROY:
        return patchState(current, {
          lifecycle: "disposed",
          isDragging: false,
          session: null,
          lastValidation: null,
          errorCode: null,
          errorMessage: null
        });
      default:
        return current;
    }
  }

  function buildLastValidation(validation) {
    return {
      isValid: validation.isValid === true,
      reason: validation.reason || null,
      dropboxId: validation.dropboxId || null,
      draggedElementType: validation.draggedElementType || null,
      validatedAt: validation.validatedAt || Date.now()
    };
  }

  function patchState(state, patch) {
    return Object.assign({}, state, patch);
  }

  return {
    ACTION_TYPES: ACTION_TYPES,
    createInitialDragDropState: createInitialDragDropState,
    reduceDragDropState: reduceDragDropState
  };
});
