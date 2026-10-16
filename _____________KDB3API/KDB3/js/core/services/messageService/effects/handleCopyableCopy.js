define(["./copyMessageText.js"], function (_copyMessageText) {
  "use strict";

  function applyCopyableCopyResult(_context, _requestId, _copied) {
    try {
      var runtime = _context._KDB.runtime.messageService;
      var request = runtime.queues.activeModalRequest;
      var options;
      if (!request || request.id !== _requestId || request.kind !== "copyable") return;
      options = request.options;
      if (_copied) {
        _context.notify({ message: options.copiedMessage || _context.labels.copied, severity: "success" });
        return;
      }
      if (request.viewHandle.copyTextEl) {
        request.viewHandle.copyTextEl.focus();
        request.viewHandle.copyTextEl.select();
      }
      _context.notify({ message: options.copyFallbackMessage || _context.labels.copyFallback, severity: "warning" });
    } catch (err) {
      console.error("[messageService.applyCopyableCopyResult] failed", err);
    }
  }

  function handleCopyableCopy(_context, _requestId) {
    try {
      var request = _context._KDB.runtime.messageService.queues.activeModalRequest;
      if (!request || request.id !== _requestId || request.kind !== "copyable") return;
      _copyMessageText(request.options.copyText).then(
        applyCopyableCopyResult.bind(null, _context, _requestId)
      );
    } catch (err) {
      console.error("[messageService.handleCopyableCopy] failed", err);
    }
  }

  return handleCopyableCopy;
});
