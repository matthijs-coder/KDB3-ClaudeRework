define(["./buildShareDashboardLink.js"], function (_buildShareDashboardLink) {
  "use strict";

  function openShareCopyDialog(_KDB, _input) {
    var input;
    var labels;
    var linkInput;
    var editUrl;
    var readOnlyUrl;
    try {
      input = _input || {};
      labels = input.labels || {};
      linkInput = {
        biBase: input.biBase,
        boardId: input.boardId,
        id: input.id,
        label: input.label,
        emptyParameterLabel: input.emptyParameterLabel
      };
      editUrl = _buildShareDashboardLink(Object.assign({}, linkInput, { isKdbReadOnly: false }));
      readOnlyUrl = _buildShareDashboardLink(Object.assign({}, linkInput, { isKdbReadOnly: true }));
      _KDB.services.message.showCopyable({
        title: input.title,
        message: "",
        copyText: readOnlyUrl,
        toggle: {
          label: labels.readOnlyToggleLabel,
          title: labels.readOnlyToggleTitle,
          isChecked: true,
          copyTextChecked: readOnlyUrl,
          copyTextUnchecked: editUrl
        }
      });
    } catch (err) {
      console.error("[shareControls.openShareCopyDialog] failed", err);
    }
  }

  return openShareCopyDialog;
});
