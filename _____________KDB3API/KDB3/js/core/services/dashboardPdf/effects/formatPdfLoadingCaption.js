define([], function () {
  "use strict";

  function __controller(_KDB, _messageKey, _params) {
    try {
      var labels;
      var message;
      labels = _KDB && _KDB.config && _KDB.config.labels && _KDB.config.labels.de
        ? _KDB.config.labels.de.loading
        : null;
      if (!labels || typeof _messageKey !== "string") return "";
      message = labels[_messageKey];
      if (typeof message !== "string" || message.length === 0) return "";
      if (_params && _params.n != null) {
        message = message.replace("{n}", String(_params.n));
      }
      if (_params && _params.m != null) {
        message = message.replace("{m}", String(_params.m));
      }
      return message;
    } catch (error) {
      console.error("[dashboardPdf.formatPdfLoadingCaption] failed", error);
      return "";
    }
  }

  return __controller;
});
