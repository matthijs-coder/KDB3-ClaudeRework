define([
  "../set/state/ensureWritebackRuntime.js",
  "./parameterSetSelectConstants.js"
], function (_ensureWritebackRuntime, _parameterSetSelectConstants) {
  "use strict";

  function revertSelect(_runtime) {
    var select;
    try {
      select = document.getElementById(_parameterSetSelectConstants.SELECT_ID);
      if (select) {
        select.value = _runtime.lastConfirmedParameterSetId || "-";
      }
    } catch (error) {
      console.error("[writeback.revertSelect] failed", error);
    }
  }

  async function confirmDiscardUnsavedChanges(_KDB, _statusKind) {
    try {
      var runtime = _ensureWritebackRuntime(_KDB);
      var shouldSkipConfirm = false;
      var svc;
      var labels;
      var result;
      if (runtime.skipDiscardConfirmOnce === true) {
        runtime.skipDiscardConfirmOnce = false;
        shouldSkipConfirm = true;
      }
      if (runtime.urlShareBootOverlayActive === true) {
        shouldSkipConfirm = true;
      }
      if (_statusKind === "default") {
        shouldSkipConfirm = true;
      }
      if (shouldSkipConfirm) {
        return true;
      }
      if (runtime.discardConfirmInFlight === true) {
        console.warn("[writeback.confirmDiscardUnsavedChanges] discarded overlapping SET");
        return false;
      }
      svc = _KDB.services && _KDB.services.message;
      if (!svc || typeof svc.confirm !== "function") {
        console.warn("[writeback.confirmDiscardUnsavedChanges] messageService unavailable — restore blocked (fail closed)");
        revertSelect(runtime);
        return false;
      }
      runtime.discardConfirmInFlight = true;
      try {
        labels = _KDB.config && _KDB.config.labels && _KDB.config.labels.de && _KDB.config.labels.de.writeback;
        result = await svc.confirm({
          code: "WRITEBACK_DISCARD_UNSAVED",
          title: labels && labels.discardUnsavedTitle,
          message: labels && labels.discardUnsavedMessage,
          confirmLabel: labels && labels.discardUnsavedConfirm,
          cancelLabel: labels && labels.discardUnsavedCancel
        });
        if (!result || result.confirmed !== true) {
          revertSelect(runtime);
          return false;
        }
        return true;
      } catch (error) {
        console.warn("[writeback.confirmDiscardUnsavedChanges] confirm rejected", error);
        revertSelect(runtime);
        return false;
      } finally {
        runtime.discardConfirmInFlight = false;
      }
    } catch (error) {
      console.error("[writeback.confirmDiscardUnsavedChanges] failed", error);
      if (runtime) {
        revertSelect(runtime);
      }
      return false;
    }
  }

  return confirmDiscardUnsavedChanges;
});
