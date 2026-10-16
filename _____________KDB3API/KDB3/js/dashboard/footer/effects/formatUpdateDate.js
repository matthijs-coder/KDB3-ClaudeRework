define([], function () {
  "use strict";
  function __controller(_rawValue) {
    try {
      if (_rawValue == null) return null;
      var text = String(_rawValue).trim();
      if (!text) return null;
      var german = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
      if (german) {
        return parseInt(german[1], 10) + "." + parseInt(german[2], 10) + "." + parseInt(german[3], 10);
      }
      var iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
      if (iso) {
        return parseInt(iso[3], 10) + "." + parseInt(iso[2], 10) + "." + parseInt(iso[1], 10);
      }
      return null;
    } catch (err) {
      console.error("[footer.formatUpdateDate]", err);
      throw err;
    }
  }
  return __controller;
});
