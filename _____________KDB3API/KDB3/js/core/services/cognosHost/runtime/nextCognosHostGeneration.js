define(["./ensureCognosHostRuntime.js"], function (_ensureCognosHostRuntime) {
  "use strict";

  // Generation token per _KDB instance (design doc section 3.5): no window.top
  // counter and no module closure state, so a second boot never inherits the
  // counter of the first. Sole monotone increment for this runtime bucket.
  function __controller(_KDB) {
    var runtime = _ensureCognosHostRuntime(_KDB);
    runtime.generation += 1;
    return runtime.generation;
  }

  return __controller;
});
