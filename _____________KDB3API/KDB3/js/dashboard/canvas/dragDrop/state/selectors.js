define([], function () {
  "use strict";

  function readDragDropState(_KDB) {
    const state = readState(_KDB);
    return state ? cloneSerializable(state) : undefined;
  }

  function readDragDropReady(_KDB) {
    const state = readState(_KDB);
    return Boolean(state && state.lifecycle === "ready");
  }

  function readDragSession(_KDB) {
    const state = readState(_KDB);
    return state && state.session ? cloneSerializable(state.session) : null;
  }

  function readIsDragging(_KDB) {
    const state = readState(_KDB);
    return Boolean(state && state.isDragging === true);
  }

  function readLastValidation(_KDB) {
    const state = readState(_KDB);
    return state && state.lastValidation ? cloneSerializable(state.lastValidation) : null;
  }

  function readState(_KDB) {
    return _KDB && _KDB.state ? _KDB.state.dragDrop : undefined;
  }

  function cloneSerializable(value) {
    return JSON.parse(JSON.stringify(value));
  }

  return {
    readDragDropReady: readDragDropReady,
    readDragDropState: readDragDropState,
    readDragSession: readDragSession,
    readIsDragging: readIsDragging,
    readLastValidation: readLastValidation
  };
});
