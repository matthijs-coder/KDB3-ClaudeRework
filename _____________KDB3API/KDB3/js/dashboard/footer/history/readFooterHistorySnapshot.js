define([], function () {
  "use strict";

  function normalizeChromeStatusForHistory(status) {
    if (status === "active") return "active";
    if (status === "removed") return "removed";
    return "removed";
  }

  function readFooterHistorySnapshot(_state, _target) {
    if (!_state || _target !== "footer.status") {
      return null;
    }
    return {
      target: "footer.status",
      value: normalizeChromeStatusForHistory(_state.status || "idle"),
    };
  }

  return readFooterHistorySnapshot;
});
