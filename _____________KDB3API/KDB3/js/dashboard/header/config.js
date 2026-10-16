define([], function () {
  "use strict";

  var DEFAULT_ICON_KEY = "Stadt-wien";
  var ICON_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;
  var IMAGES_BASE_PATH = "v1/ext/KDB3/images/";

  var VALID_SOURCES = { kdbControl: 1, api: 1, bootstrap: 1 };

  var LINKS = {
    userManual: "https://www.intern.magwien.gv.at/web/md-pr/konfigurierbares-personaldashboard",
    dataspot: "https://dxmeta.wien.gv.at/dataspot/web/dxmeta/datasets/0d1344b9-6253-4ca3-ac24-f506db843e58"
  };

  var LABELS = {
    userManual: "Benutzerhandbuch",
    dataspot: "Dataspot",
    stadtWien: "Stadt Wien"
  };

  var ERROR_CODES = {
    restoreCancelled: "WRITEBACK_RESTORE_CANCELLED",
    restoreIconUnsupported: "WRITEBACK_HEADER_FIELD_UNSUPPORTED",
    restoreFailed: "WRITEBACK_HEADER_RESTORE_FAILED"
  };

  return {
    DEFAULT_ICON_KEY: DEFAULT_ICON_KEY,
    ICON_KEY_PATTERN: ICON_KEY_PATTERN,
    IMAGES_BASE_PATH: IMAGES_BASE_PATH,
    VALID_SOURCES: VALID_SOURCES,
    LINKS: LINKS,
    LABELS: LABELS,
    ERROR_CODES: ERROR_CODES
  };
});
