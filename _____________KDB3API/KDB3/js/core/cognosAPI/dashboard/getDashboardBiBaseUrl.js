define([], function () {
  "use strict";

  function ensureTrailingSlash(_value) {
    if (!_value) return _value;
    return _value.charAt(_value.length - 1) === "/" ? _value : _value + "/";
  }

  function getDashboardBiBaseUrl() {
    var locationRef;
    var href;
    var origin;
    var match;
    var base;
    try {
      locationRef = typeof document !== "undefined" ? document.location : null;
      if (!locationRef) return null;
      href = locationRef.href;
      origin = locationRef.origin;
      match = href && href.match(/^(.*?\/cognos\/bi\/)/i);
      base = match ? match[1] : origin + "/cognos/bi/";
      return ensureTrailingSlash(base);
    } catch (error) {
      console.error("[cognosAPI.dashboard.getDashboardBiBaseUrl] failed", error);
      throw error;
    }
  }

  return getDashboardBiBaseUrl;
});
