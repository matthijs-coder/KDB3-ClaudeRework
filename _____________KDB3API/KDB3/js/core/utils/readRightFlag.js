define(["./isRightAllowed.js", "./readFirstRowScalar.js"], function (_isRightAllowed, _readFirstRowScalar) {
  "use strict";

  // True when the first cell of the first row of a data-table result is a granted right (1, "1" or true).
  function readRightFlag(_rows) {
    return _isRightAllowed(_readFirstRowScalar(_rows));
  }

  return readRightFlag;
});
