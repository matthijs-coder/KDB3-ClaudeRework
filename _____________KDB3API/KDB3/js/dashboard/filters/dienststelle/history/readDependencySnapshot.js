define(["../state/selectors.js"], function (_selectors) {
  "use strict";

  function __controller(_KDB) {
    return _selectors.readDienststelleSnapshot(_KDB) || null;
  }

  return __controller;
});
