define([
  "../actions/handleMaximizeToggle.js",
  "../actions/ensureFocusObserver.js"
], function (_handleMaximizeToggle, _ensureFocusObserver) {
  "use strict";

  return {
    handleMaximizeToggle: _handleMaximizeToggle,
    ensureFocusObserver: _ensureFocusObserver
  };
});
