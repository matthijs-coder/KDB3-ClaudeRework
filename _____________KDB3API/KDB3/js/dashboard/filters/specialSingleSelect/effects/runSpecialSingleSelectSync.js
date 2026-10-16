define([
  "../config/actions.js",
  "./performSpecialSingleSelectSync.js",
  "./routeSpecialSingleSelectAction.js"
], function (
  _actions,
  _performSpecialSingleSelectSync,
  _routeSpecialSingleSelectAction
) {
  "use strict";

  function dispatchInternal(_controller, _action) {
    var filtersState;
    if (_controller.isDisposed && (!_action || _action.type !== _actions.DESTROY)) {
      return;
    }
    filtersState = _controller._KDB.state && _controller._KDB.state.filters;
    if (filtersState) {
      filtersState.specialSingleSelect = _controller.reducer(
        filtersState.specialSingleSelect,
        _action
      );
    }
  }

  function beginSyncAbortController(_controller, _syncOptions) {
    var runtime = _controller.runtime;
    var previous = runtime.abortControllers.sync;
    if (previous && typeof previous.abort === "function") {
      previous.abort();
    }
    runtime.abortControllers.sync = new AbortController();
    runtime.abortControllers.sync.syncOptions = Object.assign({}, _syncOptions || {});
    runtime.abortControllers.sync.syncInput = _syncOptions || null;
    return runtime.abortControllers.sync;
  }

  function buildSyncFailure(_syncOptions, _error) {
    return {
      ok: false,
      inventoryGeneration: _syncOptions && _syncOptions.inventoryGeneration,
      source: _syncOptions && _syncOptions.source || null,
      results: [],
      diagnostics: [{
        code: "SPECIAL_SINGLE_SELECT_SYNC_FAILED",
        message: _error && _error.message ? _error.message : String(_error)
      }]
    };
  }

  async function runQueuedSync(_controller, _request) {
    try {
      return await _performSpecialSingleSelectSync.performSpecialSingleSelectSync(
        _controller,
        dispatchInternal,
        _request.signal,
        _request.syncOptions
      );
    } catch (_error) {
      if (_controller.isDisposed) {
        return undefined;
      }
      console.error("[specialSingleSelect.sync] failed", _error);
      dispatchInternal(_controller, {
        type: _actions.ERROR,
        payload: {
          errorCode: "SPECIAL_SINGLE_SELECT_SYNC_FAILED",
          errorMessage: _error && _error.message ? _error.message : String(_error)
        }
      });
      return buildSyncFailure(_request.syncOptions, _error);
    }
  }

  async function drainSyncQueue(_controller) {
    var result;
    while (!_controller.isDisposed) {
      var request = _controller.runtime.abortControllers.sync;
      if (!request) {
        return result;
      }
      result = await runQueuedSync(_controller, request);
      if (_controller.runtime.abortControllers.sync === request) {
        return result;
      }
    }
    return result;
  }

  function scheduleSync(_controller, _syncOptions) {
    var runtime = _controller.runtime;
    var previous = runtime.abortControllers.sync;
    if (_syncOptions && previous && previous.syncInput === _syncOptions &&
      runtime.pendingPromises.sync) {
      return runtime.pendingPromises.sync;
    }
    beginSyncAbortController(_controller, _syncOptions);
    if (runtime.pendingPromises.sync) {
      return runtime.pendingPromises.sync;
    }
    var promise = drainSyncQueue(_controller).finally(function () {
      if (runtime.pendingPromises.sync === promise) {
        delete runtime.pendingPromises.sync;
      }
    });
    runtime.pendingPromises.sync = promise;
    return promise;
  }

  function routeAction(_controller, _action) {
    return _routeSpecialSingleSelectAction.routeSpecialSingleSelectAction(
      _controller,
      dispatchInternal,
      scheduleSync,
      _action || {}
    );
  }

  return {
    dispatchInternal: dispatchInternal,
    scheduleSync: scheduleSync,
    routeAction: routeAction
  };
});
