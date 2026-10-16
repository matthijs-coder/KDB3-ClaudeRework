define([], function () {
  "use strict";

  return {
    READ_BUDGET_MS: 60000,
    POLL_INTERVAL_MS: 100,
    DEFAULT_PICK: Object.freeze(["display", "use"]),
    // User-visible German text, registered on _KDB.config.labels.de.tableData (existing values win).
    tableDataLabels: Object.freeze({
      loadFailedToast: "Tabellendaten konnten nicht geladen werden: ",
      unknownTable: "unbekannte Tabelle",
    }),
    LOAD_FAILED_CODE: "TABLE_DATA_LOAD_FAILED",
    LOAD_FAILED_MESSAGE: "Table data load failed.",
    PARK_EMPTY_CODE: "TABLE_DATA_PARK_EMPTY",
  };
});
