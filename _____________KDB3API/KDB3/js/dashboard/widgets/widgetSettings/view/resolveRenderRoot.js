define([], function () {
  function __controller(_KDB) {
    const core = _KDB && _KDB.runtime && _KDB.runtime.core && _KDB.runtime.core.domRefs;
    return core && core.renderParentEl ? core.renderParentEl : null;
  }

  return __controller;
});
