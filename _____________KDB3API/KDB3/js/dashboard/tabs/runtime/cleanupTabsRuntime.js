define(["../../../core/utils/kit/runtime.js"], function (_runtime) {
  "use strict";

  function cleanupTabsRuntime(_KDB) {
    const runtime = _KDB.runtime.tabs;
    const errors = _runtime.disposeRuntimeBuckets(runtime);
    if (errors.length > 0) {
      console.warn("[tabs.cleanupTabsRuntime] some runtime entries failed to release", errors);
    }
    runtime.adapters = {};
    runtime.lastTabMutationError = null;
    runtime.historyReplayHandlerContribution = null;
    restoreReadCurrentTab(_KDB, runtime);
  }

  // Only when the tabs binding is still installed, so a later override by another owner survives.
  function restoreReadCurrentTab(_KDB, runtime) {
    const utils = _KDB.utils;
    if (utils && runtime.readCurrentTabUnbound && utils.readCurrentTab === runtime.readCurrentTabBound) {
      utils.readCurrentTab = runtime.readCurrentTabUnbound;
    }
    runtime.readCurrentTabUnbound = null;
    runtime.readCurrentTabBound = null;
  }

  return cleanupTabsRuntime;
});
