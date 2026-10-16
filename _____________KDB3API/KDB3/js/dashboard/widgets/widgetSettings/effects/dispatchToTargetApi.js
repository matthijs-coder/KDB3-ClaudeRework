define([], function () {
  const warnedMissingApi = {};

  function dispatchToTargetApi(_KDB, _target, _action) {
    try {
      const target = String(_target || "");
      const api = _KDB && _KDB.api ? _KDB.api[target] : null;
      if (!api || typeof api.dispatch !== "function") {
        warnMissingApiOnce(target);
        return { ok: false, skipped: true, reasonCode: "API_MISSING", target: target };
      }
      return api.dispatch(_action);
    } catch (err) {
      console.error("[widgetSettings.dispatchToTargetApi] failed", { target: _target }, err);
      return { ok: false, skipped: true, reasonCode: "DISPATCH_ERROR", target: _target };
    }
  }

  function warnMissingApiOnce(_target) {
    const target = String(_target || "");
    if (!target || warnedMissingApi[target] === true) {
      return;
    }
    warnedMissingApi[target] = true;
    console.warn("[widgetSettings.dispatch] missing _KDB.api." + target + ".dispatch; downstream intent skipped");
  }

  return dispatchToTargetApi;
});
