define([], function () {
  "use strict";

  function __controller(_KDB, _options) {
    try {
      var messageKey;
      var labels;
      if (_options && typeof _options.message === "string" && _options.message.length > 0) {
        return _options.message;
      }
      messageKey = _options && _options.messageKey;
      labels = _KDB && _KDB.config && _KDB.config.labels && _KDB.config.labels.de
        ? _KDB.config.labels.de.loading
        : null;
      if (typeof messageKey === "string" && labels && typeof labels[messageKey] === "string" && labels[messageKey].length > 0) {
        return labels[messageKey];
      }
      return "";
    } catch (error) {
      console.error("[loadingService.resolveLoadingMessage] failed", error);
      throw error;
    }
  }

  return __controller;
});
