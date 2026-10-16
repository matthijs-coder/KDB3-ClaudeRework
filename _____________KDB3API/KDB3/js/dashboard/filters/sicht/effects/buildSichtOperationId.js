define([], function () {
  "use strict";

  var counter = 0;

  function buildSichtOperationId(_source) {
    counter += 1;
    return "sicht:" + (_source || "op") + ":" + Date.now() + ":" + counter;
  }

  return buildSichtOperationId;
});
