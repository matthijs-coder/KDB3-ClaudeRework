define([
  "../config/actionTypes.js",
  "../actions/commitTabsState.js",
  "./traverseOptions.js",
  "./traverseTabs.js"
], function (_actionTypes, _commitTabsState, _traverseOptions, _traverseTabs) {
  "use strict";

  // Validates a tabs/traverse request and coalesces it on runtime.tabs.pendingPromises.traverse
  // (read by other modules to detect an in-flight traversal).
  function dispatchTabsTraverse(instance, rawPayload) {
    const options = _traverseOptions.normalizeTraverseOptions(rawPayload);
    if (options.includeHelperTabs) {
      return recordTraverseFailure(instance, "TABS_HELPER_TRAVERSE_UNSUPPORTED", "Helper tab traversal is not supported.");
    }
    if (options.scope === "singleTab" && typeof options.tabIndex !== "number") {
      return recordTraverseFailure(instance, "TABS_TRAVERSE_INVALID_PAYLOAD", "scope singleTab requires tabIndex.");
    }
    const runtime = instance._KDB.runtime && instance._KDB.runtime.tabs;
    const pendingPromises = runtime && runtime.pendingPromises;
    if (!pendingPromises) {
      return _traverseTabs(buildEffectContext(instance), options);
    }
    const traverseKey = _traverseOptions.buildTraverseKey(options);
    if (pendingPromises.traverse && pendingPromises.traverseKey === traverseKey) {
      return pendingPromises.traverse;
    }
    if (pendingPromises.traverse) {
      return recordTraverseFailure(instance, "TABS_TRAVERSE_CONFLICT", "A different tabs traversal is already in flight.");
    }
    const promise = _traverseTabs(buildEffectContext(instance), options).finally(function () {
      if (pendingPromises.traverse === promise) {
        delete pendingPromises.traverse;
        delete pendingPromises.traverseKey;
      }
    });
    pendingPromises.traverse = promise;
    pendingPromises.traverseKey = traverseKey;
    return promise;
  }

  function recordTraverseFailure(instance, errorCode, errorMessage) {
    _commitTabsState(instance, { type: _actionTypes.TRAVERSE, payload: _traverseOptions.buildFailedPayload(errorCode, errorMessage) });
    return Promise.resolve(false);
  }

  function buildEffectContext(instance) {
    return {
      _KDB: instance._KDB,
      adapter: instance.adapter,
      dispatch: instance.dispatch,
      getRawState: function () { return instance._KDB.state.tabs; },
      getState: instance.getState,
      isDisposed: function () { return instance.isDisposed === true; }
    };
  }

  return dispatchTabsTraverse;
});
