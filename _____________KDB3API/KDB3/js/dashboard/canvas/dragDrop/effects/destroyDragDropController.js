define([
  "../session/finishDragSession.js",
  "../dropboxes/subscribeTabsChangedRebind.js",
  "../runtime/ensureDragDropRuntime.js",
  "../runtime/cleanupDragDropRuntime.js"
], function (_finishDragSession, _subscribeTabsChangedRebind, _ensureDragDropRuntime, _cleanupDragDropRuntime) {
  "use strict";
  function destroyDragDropController(controller) {
    const _KDB = controller._KDB;
    const runtime = _ensureDragDropRuntime(_KDB);
    if (controller.isDisposed) {
      return;
    }
    controller.isDisposed = true;
    try {
      _finishDragSession(_KDB, null, runtime);
      _subscribeTabsChangedRebind.unregister(_KDB);
      _cleanupDragDropRuntime(runtime);
      _KDB.state.dragDrop = controller.reducer(_KDB.state.dragDrop, { type: "dragDrop/destroy" });
    } catch (error) {
      console.error("[dragDrop.destroy] destroy failed", error);
    }
  }
  return destroyDragDropController;
});
