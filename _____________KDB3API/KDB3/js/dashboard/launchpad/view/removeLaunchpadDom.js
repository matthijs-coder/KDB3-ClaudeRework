define([], function () {
  function __controller(_KDB) {
    const runtime = readRuntime(_KDB);
    const domRefs = runtime.domRefs || {};

    removeElement(domRefs.hideSpotEl);
    runtime.domRefs = {};

    return true;
  }

  function readRuntime(_KDB) {
    if (!_KDB.runtime) {
      _KDB.runtime = {};
    }

    if (!_KDB.runtime.launchpad) {
      _KDB.runtime.launchpad = {};
    }

    return _KDB.runtime.launchpad;
  }

  function removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  return __controller;
});
