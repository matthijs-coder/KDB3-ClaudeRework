define([], function () {
  "use strict";

  function readMessagesFacet(_KDB) {
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime.messageService : null;
    return runtime && runtime.messagesFacet ? runtime.messagesFacet : null;
  }

  function toastUnavailableError() {
    return new Error("MESSAGE_GLASS_TOAST_UNAVAILABLE");
  }

  function mapToastOutcome(_outcome) {
    // B2: notify already owns German user text. The facet is transport only.
    // ok / degraded → toast already shown. aborted / failed → no second channel.
    if (_outcome && _outcome.ok === true) {
      return _outcome;
    }
    return _outcome;
  }

  function __controller(_KDB, _options) {
    var options = _options || {};
    var messagesFacet = readMessagesFacet(_KDB);
    if (!messagesFacet || typeof messagesFacet.showToast !== "function") {
      throw toastUnavailableError();
    }
    return Promise.resolve(
      messagesFacet.showToast(String(options.message || ""), options.severity || "info")
    ).then(mapToastOutcome);
  }

  return __controller;
});
