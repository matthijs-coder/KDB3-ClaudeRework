define([], function () {
  "use strict";

  // Aborted when either the caller's signal or the facet's own budget controller
  // has fired. Both are checked after every await, per contract section 4.
  function __controller(_signal, _controller) {
    if (_controller && _controller.signal && _controller.signal.aborted === true) {
      return true;
    }
    return !!(_signal && _signal.aborted === true);
  }

  return __controller;
});
