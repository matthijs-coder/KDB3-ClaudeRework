define([], function () {
  "use strict";

  /**
   * Returns the active kennzahlen source (table name key).
   *
   * There is no source-selector dropdown today (single Quelle).
   * A future UI may set state.kennzahlenSource.current; this getter
   * reads that pin when present and does not write _KDB.state.
   * The later dropdown must create the kennzahlenSource bucket itself.
   *
   * Resolution order:
   *   1. _KDB.state.kennzahlenSource.current when already set
   *   2. First key in kennzahlenTablesPropObj matching "personal"
   *      (case-insensitive)
   *   3. First key matching "per"
   *   4. First available key
   */
  function getKennzahlenSource(_KDB) {
    if (!_KDB) {
      return null;
    }

    var pinned =
      _KDB.state &&
      _KDB.state.kennzahlenSource &&
      _KDB.state.kennzahlenSource.current;
    if (pinned) {
      return pinned;
    }

    var tablesPropObj =
      _KDB.properties && _KDB.properties.kennzahlenTablesPropObj
        ? _KDB.properties.kennzahlenTablesPropObj
        : _KDB.widgetProperties && _KDB.widgetProperties.kennzahlenTablesPropObj
          ? _KDB.widgetProperties.kennzahlenTablesPropObj
          : null;
    if (!tablesPropObj || typeof tablesPropObj !== "object") {
      return null;
    }

    var keys = Object.keys(tablesPropObj);
    if (!keys.length) {
      return null;
    }

    var match =
      keys.find(function (k) {
        return k.toLowerCase().indexOf("personal") !== -1;
      }) ||
      keys.find(function (k) {
        return k.toLowerCase().indexOf("per") !== -1;
      }) ||
      keys[0];

    return match;
  }

  return getKennzahlenSource;
});
