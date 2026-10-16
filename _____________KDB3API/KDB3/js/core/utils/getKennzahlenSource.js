define([], function () {
  "use strict";

  // Returns the active kennzahlen source (table name key) from kennzahlenTablesPropObj:
  // the first key containing "personal" (case-insensitive), else the first containing "per", else the first key.
  function getKennzahlenSource(_KDB) {
    var tablesPropObj = _KDB && _KDB.properties ? _KDB.properties.kennzahlenTablesPropObj : null;
    var keys;

    if (!tablesPropObj || typeof tablesPropObj !== "object") {
      return null;
    }

    keys = Object.keys(tablesPropObj);
    if (!keys.length) {
      return null;
    }

    return keys.find(function (k) {
      return k.toLowerCase().indexOf("personal") !== -1;
    }) || keys.find(function (k) {
      return k.toLowerCase().indexOf("per") !== -1;
    }) || keys[0];
  }

  return getKennzahlenSource;
});
