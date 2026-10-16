define([], function () {
  "use strict";

  function cloneObject(_value) {
    if (_value == null || typeof _value !== "object") {
      return _value;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (error) {
      console.error("[sicht.readDependencySnapshots] clone failed", error);
      throw error;
    }
  }

  function readDependencySnapshots(_KDB) {
    try {
      var specialSingleSelectApi =
        _KDB && _KDB.api && _KDB.api.specialSingleSelect ? _KDB.api.specialSingleSelect : null;
      var specialSingleSelect = null;
      if (specialSingleSelectApi && typeof specialSingleSelectApi.getState === "function") {
        specialSingleSelect = cloneObject(specialSingleSelectApi.getState());
      }
      var dienststelleApi = _KDB && _KDB.api && _KDB.api.dienststelle ? _KDB.api.dienststelle : null;
      var dienststelle = null;
      if (dienststelleApi && typeof dienststelleApi.getState === "function") {
        dienststelle = cloneObject(dienststelleApi.getState());
      }
      return {
        specialSingleSelect: specialSingleSelect,
        dienststelle: dienststelle
      };
    } catch (error) {
      console.error("[sicht.readDependencySnapshots] failed", error);
      throw error;
    }
  }

  return readDependencySnapshots;
});
