define([], function () {
  "use strict";

  function createDragDropAdapter(_KDB, _options) {
    const options = _options || {};
    const dragDropApi = options.dragDropApi || readPublicDragDropApi(_KDB);
    let didWarnMissing = false;

    function refreshDropboxes() {
      if (!hasMethod(dragDropApi, "refreshDropboxes")) {
        warnMissing();
        return false;
      }

      return callAdapterMethod(dragDropApi, "refreshDropboxes", []);
    }

    function startDrag(event, payload) {
      if (!hasMethod(dragDropApi, "startDrag")) {
        warnMissing();
        return false;
      }

      return callAdapterMethod(dragDropApi, "startDrag", [event, payload]);
    }

    function finishDrag(event) {
      if (!hasMethod(dragDropApi, "finishDrag")) {
        warnMissing();
        return false;
      }

      return callAdapterMethod(dragDropApi, "finishDrag", [event]);
    }

    function warnMissing() {
      if (didWarnMissing) {
        return;
      }

      didWarnMissing = true;
      console.warn("[metricsTree.dragDropAdapter] drag/drop API unavailable; drag is disabled");
    }

    return {
      refreshDropboxes: refreshDropboxes,
      startDrag: startDrag,
      finishDrag: finishDrag
    };
  }

  function readPublicDragDropApi(_KDB) {
    return _KDB && _KDB.api && _KDB.api.dragDrop ? _KDB.api.dragDrop : null;
  }

  function hasMethod(api, methodName) {
    return Boolean(api && typeof api[methodName] === "function");
  }

  function callAdapterMethod(api, methodName, args) {
    try {
      return api[methodName].apply(api, args);
    } catch (err) {
      console.error("[metricsTree.dragDropAdapter] " + methodName + " failed", err);
      return false;
    }
  }

  return createDragDropAdapter;
});
