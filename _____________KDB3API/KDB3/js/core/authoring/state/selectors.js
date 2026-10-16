define([], function () {
  "use strict";
  function readIsAuthoring(_KDB) {
    return !!(_KDB && _KDB.state && _KDB.state.authoring && _KDB.state.authoring.isAuthoring === true);
  }
  return readIsAuthoring;
});
