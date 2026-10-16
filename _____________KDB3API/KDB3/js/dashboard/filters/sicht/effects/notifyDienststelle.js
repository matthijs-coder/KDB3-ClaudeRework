define([], function () {
  "use strict";

  async function notifyDienststelle(_KDB, _selection, _payload) {
    try {
      var payload = _payload || {};
      var api = _KDB && _KDB.api ? _KDB.api.dienststelle : null;
      if (payload.isHistoryReplay === true ||
        !api || typeof api.dispatch !== "function") {
        return { ok: true, skipped: true };
      }
      await Promise.resolve(api.dispatch({
        type: "dienststelle/sichtChanged",
        payload: {
          activeSichtValue: _selection.displayValue,
          selection: {
            displayValue: _selection.displayValue,
            useValue: _selection.useValue
          },
          source: payload.isStartupDefault === true ? "startup" : "user",
          observedAt: payload.timestamp
        }
      }));
      return { ok: true };
    } catch (error) {
      console.error("[sicht.notifyDienststelle] failed", error);
      return {
        ok: false,
        code: "SICHT_DOWNSTREAM_DIENSTSTELLE_FAILED",
        message: String(error && error.message ? error.message : error)
      };
    }
  }

  return notifyDienststelle;
});
