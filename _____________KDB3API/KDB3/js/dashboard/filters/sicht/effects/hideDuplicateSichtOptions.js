define([
  "./readSichtOptionLabel.js"
], function (_readSichtOptionLabel) {
  "use strict";

  function hideDuplicateSichtOptions(_optionElArr) {
    var byLabel = {};
    var duplicateArr;
    var keeperEl;
    var idx;
    var label;
    _optionElArr.forEach(function (_optionEl) {
      label = _readSichtOptionLabel.readSichtOptionLabel(_optionEl);
      if (label && label !== "Alle") {
        byLabel[label] = byLabel[label] || [];
        byLabel[label].push(_optionEl);
      }
    });
    Object.keys(byLabel).forEach(function (_label) {
      duplicateArr = byLabel[_label];
      if (!duplicateArr || duplicateArr.length <= 1) {
        return;
      }
      keeperEl = duplicateArr[0];
      for (idx = 0; idx < duplicateArr.length; idx += 1) {
        if (_readSichtOptionLabel.isSichtOptionSelected(duplicateArr[idx])) {
          keeperEl = duplicateArr[idx];
          break;
        }
      }
      duplicateArr.forEach(function (_optionEl) {
        if (_optionEl !== keeperEl) {
          _optionEl.style.display = "none";
        }
      });
    });
  }

  return hideDuplicateSichtOptions;
});
