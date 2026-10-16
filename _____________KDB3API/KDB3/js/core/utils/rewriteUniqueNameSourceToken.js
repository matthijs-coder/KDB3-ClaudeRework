define([], function () {
  "use strict";

  function normalizeTargetSourceToken(_targetSourceToken) {
    const targetSourceToken = typeof _targetSourceToken === "string"
      ? _targetSourceToken.trim()
      : "";

    if (!targetSourceToken) {
      return "";
    }

    return /_TM1$/i.test(targetSourceToken)
      ? targetSourceToken
      : targetSourceToken + "_TM1";
  }

  // Rewrites only the leading source token of a Cognos/TM1 unique name.
  function __rewriteUniqueNameSourceToken__(_uniqueName, _targetSourceToken) {
    const uniqueName = typeof _uniqueName === "string" ? _uniqueName : "";
    const targetSourceToken = normalizeTargetSourceToken(_targetSourceToken);
    const firstTokenMatch = uniqueName.match(/^\[([^\]]+)\]/);

    if (!uniqueName || !targetSourceToken || !firstTokenMatch) {
      return _uniqueName;
    }

    return "[" + targetSourceToken + "]" + uniqueName.slice(firstTokenMatch[0].length);
  }

  function rewriteValueObjSourceToken(_valueObj, _targetSourceToken) {
    if (!_valueObj || typeof _valueObj !== "object") {
      return _valueObj;
    }

    const nextValueObj = Object.assign({}, _valueObj);
    nextValueObj.u = __rewriteUniqueNameSourceToken__(_valueObj.u, _targetSourceToken);
    return nextValueObj;
  }

  function rewriteValueArrSourceToken(_valueArr, _targetSourceToken) {
    const valueArr = Array.isArray(_valueArr) ? _valueArr : [];

    return valueArr.map(function (_valueObj) {
      return rewriteValueObjSourceToken(_valueObj, _targetSourceToken);
    });
  }

  return {
    rewriteUniqueNameSourceToken: __rewriteUniqueNameSourceToken__,
    rewriteValueObjSourceToken: rewriteValueObjSourceToken,
    rewriteValueArrSourceToken: rewriteValueArrSourceToken,
  };
});
