define([
  "../actions/handleDienststelleChanged.js"
], function (_dienststelleChanged) {
  "use strict";

  return {
    handleDienststelleChanged: _dienststelleChanged.handleDienststelleChanged,
    broadcastDienststelleChanged: _dienststelleChanged.broadcastDienststelleChanged
  };
});
