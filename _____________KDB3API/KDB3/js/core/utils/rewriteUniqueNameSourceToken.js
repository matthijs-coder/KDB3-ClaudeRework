define([], function () {
  "use strict";

  function stripTm1Suffix(_token) {
    return String(_token).replace(/_TM1$/i, "");
  }

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

  // Rewrites only the leading source token of a Cognos/TM1 unique name. With `_expectedSourceToken` the
  // rewrite applies only when the current token matches it (case-insensitive, `_TM1` suffix ignored).
  function rewriteUniqueNameSourceToken(_uniqueName, _targetSourceToken, _expectedSourceToken) {
    const uniqueName = typeof _uniqueName === "string" ? _uniqueName : "";
    const targetSourceToken = normalizeTargetSourceToken(_targetSourceToken);
    const firstTokenMatch = uniqueName.match(/^\[([^\]]+)\]/);

    if (!uniqueName || !targetSourceToken || !firstTokenMatch) {
      return _uniqueName;
    }

    if (_expectedSourceToken && typeof _expectedSourceToken === "string") {
      const expectedToken = stripTm1Suffix(_expectedSourceToken);
      if (expectedToken && stripTm1Suffix(firstTokenMatch[1]).toLowerCase() !== expectedToken.toLowerCase()) {
        return _uniqueName;
      }
    }

    return "[" + targetSourceToken + "]" + uniqueName.slice(firstTokenMatch[0].length);
  }

  return { rewriteUniqueNameSourceToken: rewriteUniqueNameSourceToken };
});
