define([], function () {
  "use strict";

  function isThenable(_value) {
    return !!(
      _value &&
      (typeof _value === "object" || typeof _value === "function") &&
      typeof _value.then === "function"
    );
  }

  function flattenBoardId(_info) {
    var boardId;
    var asString;
    if (_info == null) return null;
    if (isThenable(_info)) return null;
    boardId = _info.boardId;
    if (typeof boardId === "string" || typeof boardId === "number") {
      asString = String(boardId);
      if (asString) return asString;
    }
    return null;
  }

  function getBoardId() {
    try {
      return flattenBoardId(__getDashboardAPI().getDashboardInfo());
    } catch (error) {
      console.error("[cognosAPI.dashboard.getBoardId] failed", error);
      throw error;
    }
  }

  return getBoardId;
});
