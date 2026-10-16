define([], function () {
  "use strict";

  function readVisualizationsConfig(_KDB) {
    return (_KDB && _KDB.config && _KDB.config.visualizations) || {};
  }

  return readVisualizationsConfig;
});
