define([], function () {
  "use strict";

  async function notifySpecialSingleSelect(_KDB, _selection) {
    try {
      var api = _KDB && _KDB.api ? _KDB.api.specialSingleSelect : null;
      if (!api || typeof api.dispatch !== "function" || !_selection) {
        return { ok: true, skipped: true };
      }
      await Promise.resolve(api.dispatch({
        type: "specialSingleSelect/sichtChanged",
        payload: { activeSichtValue: _selection.displayValue }
      }));
      return { ok: true };
    } catch (error) {
      console.error("[sicht.notifySpecialSingleSelect] failed", error);
      return {
        ok: false,
        code: "SICHT_DOWNSTREAM_SPECIAL_FAILED",
        message: String(error && error.message ? error.message : error)
      };
    }
  }

  return notifySpecialSingleSelect;
});
