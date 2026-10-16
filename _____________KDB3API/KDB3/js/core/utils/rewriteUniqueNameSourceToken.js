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
  function rewriteUniqueNameSourceToken(_uniqueName, _targetSourceToken) {
    const uniqueName = typeof _uniqueName === "string" ? _uniqueName : "";
    const targetSourceToken = normalizeTargetSourceToken(_targetSourceToken);
    const firstTokenMatch = uniqueName.match(/^\[([^\]]+)\]/);

    if (!uniqueName || !targetSourceToken || !firstTokenMatch) {
      return _uniqueName;
    }

    return "[" + targetSourceToken + "]" + uniqueName.slice(firstTokenMatch[0].length);
  }

  return { rewriteUniqueNameSourceToken: rewriteUniqueNameSourceToken };
});
