define([
  "./evaluateAndStoreSichtOptions.js",
  "./commitStartupSichtDefault.js"
], function (_evaluateAndStoreSichtOptions, _commitStartupSichtDefault) {
  "use strict";

  async function syncSichtOptionsAndStartup(_KDB, _dispatchInternal) {
    try {
      var byOption = _evaluateAndStoreSichtOptions(_KDB, _dispatchInternal);
      return await _commitStartupSichtDefault(_KDB, _dispatchInternal, byOption);
    } catch (error) {
      console.error("[sicht.syncSichtOptionsAndStartup] failed", error);
      return { ok: false, reason: "syncFailed" };
    }
  }

  return syncSichtOptionsAndStartup;
});
