define([], function () {
  "use strict";

  // The messages facet's single reach into _KDB.cognosAPI.glassMessages.
  // Callers bind the return value as messagesApi. There is no
  // _KDB.cognosAPI.messages. Resolved per call, never captured: cluster A
  // nulls _KDB.cognosAPI on teardown.
  function __controller(_KDB) {
    if (!_KDB || !_KDB.cognosAPI) {
      return null;
    }
    return _KDB.cognosAPI.glassMessages || null;
  }

  return __controller;
});
