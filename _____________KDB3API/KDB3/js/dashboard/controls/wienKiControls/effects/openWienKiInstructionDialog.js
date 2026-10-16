define([
  "./openWienKiPopup.js"
], function (_openWienKiPopup) {
  "use strict";

  function readInstructionLabels(_KDB) {
    var de = _KDB.config && _KDB.config.labels && _KDB.config.labels.de;
    var labels = (de && de.wienKiControls) || {};
    return {
      dialogTitle: labels.dialogTitle || "",
      dialogMessage: labels.dialogMessage || "",
      starterPrompt: labels.starterPrompt || "",
      openChatLabel: labels.openChatLabel || ""
    };
  }

  function onInstructionSettled(_KDB, _openPopup, _result) {
    var runtime;
    try {
      runtime = _KDB.runtime && _KDB.runtime.wienKiControls;
      if (runtime) runtime.instructionDialogOpen = false;
      if (_result && _result.action === "selected") _openPopup(_KDB);
    } catch (err) {
      console.error("[wienKiControls.onInstructionSettled]", err);
    }
  }

  function openWienKiInstructionDialog(_KDB) {
    var runtime;
    var message;
    var labels;
    var handle;
    try {
      runtime = _KDB.runtime.wienKiControls;
      if (!runtime) return;
      if (runtime.instructionDialogOpen === true) return;
      message = _KDB.services && _KDB.services.message;
      if (!message || typeof message.showCopyable !== "function") return;
      labels = readInstructionLabels(_KDB);
      runtime.instructionDialogOpen = true;
      handle = message.showCopyable({
        title: labels.dialogTitle,
        message: labels.dialogMessage,
        copyText: labels.starterPrompt,
        actionLabel: labels.openChatLabel
      });
      if (!handle || typeof handle.whenDone !== "function") {
        runtime.instructionDialogOpen = false;
        return;
      }
      handle.whenDone(onInstructionSettled.bind(null, _KDB, _openWienKiPopup));
    } catch (err) {
      if (runtime) runtime.instructionDialogOpen = false;
      console.error("[wienKiControls.openWienKiInstructionDialog]", err);
    }
  }

  return openWienKiInstructionDialog;
});
