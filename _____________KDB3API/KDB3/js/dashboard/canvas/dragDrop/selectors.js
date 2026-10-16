define(["../../../core/utils/kit/data.js"], function (_data) {
  "use strict";

  function readDragDropState(_KDB) {
    const state = readRawState(_KDB);
    return state ? _data.cloneJson(state) : undefined;
  }

  // Hot path (dragover): no clone, callers must not mutate the session.
  function readActiveSession(_KDB) {
    const state = readRawState(_KDB);
    return state && state.session ? state.session : null;
  }

  function readRawState(_KDB) {
    return _KDB && _KDB.state ? _KDB.state.dragDrop : undefined;
  }

  return {
    readActiveSession: readActiveSession,
    readDragDropState: readDragDropState
  };
});
