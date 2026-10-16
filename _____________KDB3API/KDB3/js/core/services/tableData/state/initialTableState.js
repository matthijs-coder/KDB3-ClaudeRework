define([], function () {
  "use strict";

  function readString(_value) {
    const value = String(_value == null ? "" : _value).trim();
    return value || null;
  }

  function initialTableState(_input) {
    const input = _input || {};
    const state = {
      lifecycle: "idle",
      freshness: "stale",
      tableHandle: readString(input.tableHandle),
      tableName: readString(input.tableName),
      title: readString(input.title),
      widgetId: readString(input.widgetId),
      role: readString(input.role),
      shape: input.shape || "row",
      pick: copyPick(input.pick),
      rows: null,
      sourceRows: null,
      rowCount: 0,
      isHierarchy: false,
      hasData: false,
      errorCode: null,
      errorMessage: null,
      lastLoadedAt: null,
    };
    if (input.isCoreTable === true) {
      state.isCoreTable = true;
    }
    return state;
  }

  function copyPick(pick) {
    if (!Array.isArray(pick)) {
      return ["display", "use"];
    }
    const copied = [];
    for (let index = 0; index < pick.length; index += 1) {
      copied.push(copyPickItem(pick[index]));
    }
    return copied;
  }

  function copyPickItem(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return item;
    }
    const copy = {};
    const keys = Object.keys(item);
    for (let index = 0; index < keys.length; index += 1) {
      copy[keys[index]] = item[keys[index]];
    }
    return copy;
  }

  return initialTableState;
});
