define([], function () {
  "use strict";

  function __controller(_spec) {
    try {
      var env = _spec && _spec.hostEnv;
      var href;
      if (env === "dev" || env === "test" || env === "prod") {
        return env;
      }
      href = window && window.location && window.location.href ? String(window.location.href) : "";
      if (!href) {
        return null;
      }
      if (href.indexOf("-dev") !== -1) {
        return "dev";
      }
      if (href.indexOf("-test") !== -1) {
        return "test";
      }
      return "prod";
    } catch (err) {
      console.error("[drillthrough.resolveHostEnv]", err);
      return null;
    }
  }

  return __controller;
});
