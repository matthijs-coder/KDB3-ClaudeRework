define([], function () {
  "use strict";

  return {
    READ_BUDGET_MS: 60000,
    POLL_INTERVAL_MS: 100,
    DEFAULT_PICK: Object.freeze(["display", "use"]),
    LOAD_FAILED_TOAST: "Tabellendaten konnten nicht geladen werden: ",
    UNKNOWN_TABLE_LABEL: "unbekannte Tabelle",
    LOAD_FAILED_CODE: "TABLE_DATA_LOAD_FAILED",
    LOAD_FAILED_MESSAGE: "Table data load failed.",
    PARK_EMPTY_CODE: "TABLE_DATA_PARK_EMPTY",
  };
});
