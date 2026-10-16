define([], function () {
  "use strict";

  function isThenable(_value) {
    return !!(
      _value &&
      (typeof _value === "object" || typeof _value === "function") &&
      typeof _value.then === "function"
    );
  }

  function flattenUserName(_account) {
    var userName;
    var asString;
    if (_account == null) return null;
    if (isThenable(_account)) return null;
    userName = _account.userName;
    if (typeof userName === "string" || typeof userName === "number") {
      asString = String(userName).trim();
      if (asString) return asString;
    }
    return null;
  }

  function getUserName() {
    try {
      return flattenUserName(__getDashboardAPI().getFeature("UserProfile").getUserAccount());
    } catch (err) {
      console.error("[cognosAPI.dashboard.getUserName]", err);
      throw err;
    }
  }

  return getUserName;
});
