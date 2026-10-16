define([], function () {
  "use strict";

  function isChromeHistoryTarget(target) {
    return target === "header.status" || target === "header.subtitleStatus";
  }
  function isTextHistoryTarget(target) {
    return target === "header.titleText" || target === "header.subtitleText";
  }
  function normalizeSubtitleStatus(status) {
    return status === "active" || status === "visible" ? "active" : "removed";
  }
  function normalizeChromeStatusForHistory(status) {
    if (status === "active") return "active";
    if (status === "removed") return "removed";
    return "removed";
  }

  function readHeaderHistorySnapshot(_state, _target) {
    if (!_state || typeof _target !== "string") {
      return null;
    }
    if (_target === "header.titleText") {
      return {
        target: "header.titleText",
        value: { titleText: _state.titleText == null ? "" : String(_state.titleText) },
      };
    }
    if (_target === "header.subtitleText") {
      return {
        target: "header.subtitleText",
        value: {
          subtitleText: _state.subtitleText == null ? "" : String(_state.subtitleText),
          subtitleStatus: normalizeSubtitleStatus(_state.subtitleStatus),
        },
      };
    }
    if (!isChromeHistoryTarget(_target)) {
      return null;
    }
    if (_target === "header.status") {
      return {
        target: "header.status",
        value: normalizeChromeStatusForHistory(_state.status || "idle"),
      };
    }
    return {
      target: "header.subtitleStatus",
      value: {
        status: _state.status || "idle",
        subtitleStatus: normalizeSubtitleStatus(_state.subtitleStatus),
        subtitleText: _state.subtitleText == null ? "" : String(_state.subtitleText),
      },
    };
  }

  return readHeaderHistorySnapshot;
});
