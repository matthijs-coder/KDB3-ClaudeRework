define([], function () {
  "use strict";

  function normalizeTargetToken(_targetToken) {
    var token = typeof _targetToken === "string" ? _targetToken.trim() : "";
    if (!token) {
      return "";
    }
    return /_TM1$/i.test(token) ? token : token + "_TM1";
  }

  function __controller(_value, _sourceToken, _targetToken) {
    var uniqueName = typeof _value === "string" ? _value : "";
    var targetToken = normalizeTargetToken(_targetToken);
    var firstTokenMatch = uniqueName.match(/^\[([^\]]+)\]/);

    if (!uniqueName || !targetToken || !firstTokenMatch) {
      return _value;
    }

    if (_sourceToken && typeof _sourceToken === "string") {
      var sourceNorm = _sourceToken.replace(/_TM1$/i, "");
      var currentNorm = firstTokenMatch[1].replace(/_TM1$/i, "");
      if (sourceNorm && currentNorm.toLowerCase() !== sourceNorm.toLowerCase()) {
        return _value;
      }
    }

    return "[" + targetToken + "]" + uniqueName.slice(firstTokenMatch[0].length);
  }

  return __controller;
});
