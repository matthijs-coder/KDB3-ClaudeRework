define(["../runtime/readDockRoot.js", "./scheduleObservedDockState.js"], function (
  _readDockRoot,
  _scheduleObservedDockState
) {
  "use strict";

  function onDockMutations(_KDB, _runtime, _dispatch, _options, _mutationRecords) {
    try {
      _scheduleObservedDockState(_KDB, _runtime, _dispatch, _mutationRecords, _options);
    } catch (error) {
      console.error("[filterDock.onDockMutations] failed", error);
    }
  }

  function __controller(_KDB, _runtime, _dispatch, _options) {
    if (_runtime.observers && _runtime.observers.dock) {
      return true;
    }
    var dockRoot = _readDockRoot(_KDB);
    if (!dockRoot) {
      console.warn("[filterDock.mount] dock root not found");
      return false;
    }
    try {
      var observerCallback = onDockMutations.bind(null, _KDB, _runtime, _dispatch, _options);
      var observer = new MutationObserver(observerCallback);
      var observeOptions = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "aria-disabled", "data-tid"]
      };
      observer.observe(dockRoot, observeOptions);
      _runtime.observers.dock = observer;
      _runtime.domRefs = _runtime.domRefs || {};
      _runtime.domRefs.dockRoot = dockRoot;
      return true;
    } catch (error) {
      console.error("[filterDock.bindDockObserver] failed", error);
      return false;
    }
  }

  return __controller;
});
