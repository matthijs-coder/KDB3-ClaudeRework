define([], function () {
  "use strict";

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

  return {
    DEFAULT_PATH_COLUMNS: DEFAULT_PATH_COLUMNS,
    CODE_COLUMN_CANDIDATES: CODE_COLUMN_CANDIDATES,
    DISPLAY_COLUMN_CANDIDATES: DISPLAY_COLUMN_CANDIDATES,
    LANGTEXT_COLUMN_CANDIDATES: LANGTEXT_COLUMN_CANDIDATES,
    PATH_TEXT_COLUMN_CANDIDATES: PATH_TEXT_COLUMN_CANDIDATES,
    RELEASE_COLUMN_CANDIDATES: RELEASE_COLUMN_CANDIDATES,
    URL_COLUMN_CANDIDATES: URL_COLUMN_CANDIDATES
  };
});
