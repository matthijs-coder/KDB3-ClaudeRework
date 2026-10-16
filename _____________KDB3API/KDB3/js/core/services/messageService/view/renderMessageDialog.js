define([
  "./bindMessageDialog.js",
  "./buildMessageDialog.js",
  "./createMessageRoot.js"
], function (_bindMessageDialog, _buildMessageDialog, _createMessageRoot) {
  "use strict";

  function render(_KDB, _request, _labels, _onAction) {
    var runtime = _KDB.runtime.messageService;
    var portalEl = _createMessageRoot(_KDB);
    var handle = _buildMessageDialog(portalEl.ownerDocument, _request, _labels);
    portalEl.appendChild(handle.backdropEl);
    return _bindMessageDialog.bind(runtime, handle, _request, _onAction);
  }

  function cleanup(_KDB, _handle) {
    _bindMessageDialog.cleanup(_KDB.runtime.messageService, _handle);
  }

  return { cleanup: cleanup, render: render };
});
