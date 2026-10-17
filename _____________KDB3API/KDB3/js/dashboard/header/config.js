define(["../../core/config/assetBase.js"], function (_assetBase) {
  "use strict";

  var DEFAULT_ICON_KEY = "Stadt-wien";
  // Catalog stems may contain spaces, dots and umlauts; only characters that can change the image URL target are rejected.
  var ICON_KEY_UNSAFE_PATTERN = /[\/\\:?#%\u0000-\u001f\u007f]|\.\./;
  var IMAGES_BASE_PATH = _assetBase.assetPath("images/");

  var VALID_SOURCES = { kdbControl: 1, api: 1, bootstrap: 1 };

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
    ICON_KEY_UNSAFE_PATTERN: ICON_KEY_UNSAFE_PATTERN,
    IMAGES_BASE_PATH: IMAGES_BASE_PATH,
    VALID_SOURCES: VALID_SOURCES,
    LABELS: LABELS,
    ERROR_CODES: ERROR_CODES
  };
});
