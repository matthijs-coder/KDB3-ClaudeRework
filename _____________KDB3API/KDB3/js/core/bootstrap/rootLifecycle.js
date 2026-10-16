define([], function () {
  "use strict";

  // Root lifecycle terms: idle, initializing, ready, error, disposed.
  function createInitialRootLifecycle() {
    return { lifecycle: "idle", errorCode: null, errorMessage: null };
  }

  function setRootLifecycle(_KDB, _lifecycle, _error) {
    _KDB.state.rootLifecycle = {
      lifecycle: _lifecycle,
      errorCode: _error ? "ROOT_LIFECYCLE_ERROR" : null,
      errorMessage: _error ? String(_error.message || _error) : null
    };
  }

  return {
    createInitialRootLifecycle: createInitialRootLifecycle,
    setRootLifecycle: setRootLifecycle
  };
});
