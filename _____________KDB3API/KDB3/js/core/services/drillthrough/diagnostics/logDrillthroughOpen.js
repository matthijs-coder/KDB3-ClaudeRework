define([], function () {
  "use strict";

  function parseQueryParams(_url) {
    var out = {};
    var query;
    var i;
    var pair;
    var eq;
    var key;
    var rawVal;
    var decoded;
    try {
      if (!_url || typeof _url !== "string") {
        return out;
      }
      query = _url.split("?");
      if (query.length < 2) {
        return out;
      }
      query = query.slice(1).join("?").split("&");
      for (i = 0; i < query.length; i += 1) {
        pair = query[i];
        eq = pair.indexOf("=");
        if (eq === -1) {
          key = pair;
          rawVal = "";
        } else {
          key = pair.slice(0, eq);
          rawVal = pair.slice(eq + 1);
        }
        try {
          decoded = decodeURIComponent(rawVal);
        } catch (_decodeErr) {
          decoded = rawVal;
        }
        out[key] = decoded;
      }
      return out;
    } catch (_err) {
      return out;
    }
  }

  function logOpen(_built) {
    try {
      var built = _built || {};
      console.log("[drillthrough.openDrillthrough]", {
        url: built.url,
        params: parseQueryParams(built.url),
        drillConfig: built.drillConfig,
        source: built.source,
        widgetId: built.widgetId,
        warnings: built.diagnostics && built.diagnostics.warnings
      });
    } catch (err) {
      console.error("[drillthrough.openDrillthrough] log failed", err);
    }
  }

  function __controller(_built) {
    try {
      logOpen(_built);
    } catch (err) {
      console.error("[drillthrough.openDrillthrough] log failed", err);
    }
  }

  return __controller;
});
