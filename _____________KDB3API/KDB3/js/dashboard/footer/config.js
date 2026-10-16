define([], function () {
  "use strict";

  var VALID_SOURCES = { kdbControl: 1, api: 1, bootstrap: 1 };

  var MOUNT_TARGET_TIMEOUT_MS = 30000;

  var UPDATE_DATE_TABLE_INPUT = [{ tableName: "update_date", shape: "row", isCoreTable: true }];

  var LABELS = {
    dataExcellence: "Data Excellence Conform",
    updateDatePrefix: "Datenaktualisierung: ",
    updateDateUnknown: "n.v.",
    userUnknown: "unbekannt"
  };

  var ERROR_CODES = {
    restoreCancelled: "WRITEBACK_RESTORE_CANCELLED",
    headerGuard: "WRITEBACK_FOOTER_HEADER_GUARD",
    restoreFailed: "WRITEBACK_FOOTER_RESTORE_FAILED"
  };

  return {
    VALID_SOURCES: VALID_SOURCES,
    MOUNT_TARGET_TIMEOUT_MS: MOUNT_TARGET_TIMEOUT_MS,
    UPDATE_DATE_TABLE_INPUT: UPDATE_DATE_TABLE_INPUT,
    LABELS: LABELS,
    ERROR_CODES: ERROR_CODES
  };
});
