define([], function () {
  "use strict";

  const DOM_SELECTORS = {
    rootSelector: "#kdb-control_metrics_container"
  };

  const METRICS_TABLE_KEY = "personal_kdb";
  const SUPERUSER_TABLE_NAME = "superuser";
  const LOADING_MOUNT_KEY = "kdb-metrics-tree-loading";
  const LOADING_MESSAGE_KEY = "metrics";

  const DEFAULT_PATH_COLUMNS = ["Gruppe1", "Gruppe2", "Gruppe3"];
  const CODE_COLUMN_CANDIDATES = [
    "Kennzahlen - Name",
    "CODE",
    "Code",
    "code",
    "KENNZAHL",
    "Kennzahl",
    "kennzahl",
    "ID",
    "Id",
    "id"
  ];
  const DISPLAY_COLUMN_CANDIDATES = [
    "KURZTEXT",
    "Kurztext",
    "kurztext",
    "DISPLAY",
    "Display",
    "display",
    "LABEL",
    "Label",
    "label"
  ];
  const LANGTEXT_COLUMN_CANDIDATES = ["LANGTEXT", "Langtext", "langtext"];
  const PATH_TEXT_COLUMN_CANDIDATES = ["PFAD", "Pfad", "pfad", "PATH", "Path", "path"];
  const RELEASE_COLUMN_CANDIDATES = ["FREIGABE", "Freigabe", "freigabe"];
  const URL_COLUMN_CANDIDATES = ["URL", "Url", "url"];

  const SEARCH_ICON_SVG = [
    '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000">',
    '<path d="M0 0h24v24H0z" fill="none"></path>',
    '<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16a6.471 6.471 0 004.23-1.57',
    "l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z",
    '"></path></svg>'
  ].join("");

  return {
    DOM_SELECTORS: DOM_SELECTORS,
    METRICS_TABLE_KEY: METRICS_TABLE_KEY,
    SUPERUSER_TABLE_NAME: SUPERUSER_TABLE_NAME,
    LOADING_MOUNT_KEY: LOADING_MOUNT_KEY,
    LOADING_MESSAGE_KEY: LOADING_MESSAGE_KEY,
    DEFAULT_PATH_COLUMNS: DEFAULT_PATH_COLUMNS,
    CODE_COLUMN_CANDIDATES: CODE_COLUMN_CANDIDATES,
    DISPLAY_COLUMN_CANDIDATES: DISPLAY_COLUMN_CANDIDATES,
    LANGTEXT_COLUMN_CANDIDATES: LANGTEXT_COLUMN_CANDIDATES,
    PATH_TEXT_COLUMN_CANDIDATES: PATH_TEXT_COLUMN_CANDIDATES,
    RELEASE_COLUMN_CANDIDATES: RELEASE_COLUMN_CANDIDATES,
    URL_COLUMN_CANDIDATES: URL_COLUMN_CANDIDATES,
    SEARCH_ICON_SVG: SEARCH_ICON_SVG
  };
});
