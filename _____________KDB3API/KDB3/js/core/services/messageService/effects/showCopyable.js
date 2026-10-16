define([], function () {
  "use strict";

  function __controller(context, _options) {
    var options;
    var raw;
    var trimmed;
    try {
      options = _options || {};
      raw = options.actionLabel;
      trimmed = String(raw == null ? "" : raw).replace(/^\s+|\s+$/g, "");
      if (!trimmed) {
        context.modalQueue.enqueuePassive("copyable", options);
        return;
      }
      options.actionLabel = trimmed;
      return context.modalQueue.enqueueCopyableAction(options);
    } catch (err) {
      console.error("[messageService.showCopyable]", err);
    }
  }

  return __controller;
});
