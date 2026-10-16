define([], function () {
  "use strict";

  function stripTabpanel(_scope) {
    try {
      return String(_scope || "").replace(/_tabpanel$/, "");
    } catch (error) {
      console.error("[nativeMultiSelect.stripTabpanel] failed", error);
      throw error;
    }
  }

  return stripTabpanel;
});
