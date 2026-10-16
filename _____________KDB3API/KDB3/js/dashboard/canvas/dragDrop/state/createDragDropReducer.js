define([], function () {
  "use strict";

  function createDragDropReducer() {
    return reduceDragDropState;
  }

  function reduceDragDropState(state, action) {
    const currentState = state || {};
    const currentAction = action || {};

    if (currentAction.type === "dragDrop/mountSucceeded") {
      return applyMountSucceeded(currentState, currentAction.payload);
    }
    if (currentAction.type === "dragDrop/dragStarted") {
      return applyDragStarted(currentState, currentAction.payload);
    }
    if (currentAction.type === "dragDrop/dropValidated") {
      return applyDropValidated(currentState, currentAction.payload);
    }
    if (currentAction.type === "dragDrop/dragFinished") {
      return applyDragFinished(currentState);
    }
    if (currentAction.type === "dragDrop/error") {
      return applyError(currentState, currentAction.payload);
    }
    if (currentAction.type === "dragDrop/destroy") {
      return applyDestroy(currentState);
    }
    return currentState;
  }

  function applyMountSucceeded(state, payload) {
    return copyState(state, {
      lifecycle: "ready",
      mountedAt: payload && payload.mountedAt ? payload.mountedAt : Date.now(),
      errorCode: null,
      errorMessage: null
    });
  }

  function applyDragStarted(state, payload) {
    return copyState(state, {
      lifecycle: state.lifecycle === "disposed" ? "disposed" : "ready",
      isDragging: true,
      session: cloneSerializable(payload || null),
      lastValidation: null,
      errorCode: null,
      errorMessage: null
    });
  }

  function applyDropValidated(state, payload) {
    const validation = payload || {};
    return copyState(state, {
      lastValidation: {
        isValid: validation.isValid === true,
        reason: validation.reason || null,
        dropboxId: validation.dropboxId || null,
        draggedElementType: validation.draggedElementType || null,
        validatedAt: validation.validatedAt || Date.now()
      }
    });
  }

  function applyDragFinished(state) {
    return copyState(state, {
      lifecycle: state.lifecycle === "disposed" ? "disposed" : "ready",
      isDragging: false,
      session: null
    });
  }

  function applyError(state, payload) {
    const errorPayload = payload || {};
    return copyState(state, {
      lifecycle: "error",
      isDragging: false,
      errorCode: errorPayload.errorCode || "DRAG_DROP_ERROR",
      errorMessage: errorPayload.errorMessage || null
    });
  }

  function applyDestroy(state) {
    return copyState(state, {
      lifecycle: "disposed",
      isDragging: false,
      session: null,
      lastValidation: null,
      errorCode: null,
      errorMessage: null
    });
  }

  function copyState(state, patch) {
    const nextState = {};
    const keys = Object.keys(state || {});
    let index;

    for (index = 0; index < keys.length; index += 1) {
      nextState[keys[index]] = state[keys[index]];
    }
    return Object.assign(nextState, patch || {});
  }

  function cloneSerializable(value) {
    if (value == null) {
      return value;
    }
    return JSON.parse(JSON.stringify(value));
  }

  return createDragDropReducer;
});
