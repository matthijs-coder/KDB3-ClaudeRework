define(["../config/shareReadOnlyToken.js"], function (_shareReadOnlyToken) {
  "use strict";

  var TOKEN_KEY = _shareReadOnlyToken.TOKEN_KEY;
  var TOKEN_VALUE = _shareReadOnlyToken.TOKEN_VALUE;

  function readNavigationName() {
    var entries;
    try {
      if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
        return null;
      }
      entries = performance.getEntriesByType("navigation");
      if (entries && entries[0] && entries[0].name) return entries[0].name;
      return null;
    } catch (_error) {
      return null;
    }
  }

  function readDocumentHref() {
    try {
      return typeof document !== "undefined" && document.location && document.location.href
        ? document.location.href
        : null;
    } catch (_error) {
      return null;
    }
  }

  function readDocumentOrigin() {
    try {
      return typeof document !== "undefined" && document.location && document.location.origin
        ? document.location.origin
        : undefined;
    } catch (_error) {
      return undefined;
    }
  }

  function readHashTokenValue(_hash) {
    var stripped;
    var queryPart;
    var params;
    stripped = String(_hash || "").replace(/^#/, "");
    if (!stripped) return null;
    queryPart = stripped.indexOf("?") !== -1 ? stripped.split("?")[1] : stripped;
    params = new URLSearchParams(queryPart);
    return params.get(TOKEN_KEY);
  }

  function extractReadOnlyPresent(_href) {
    var url;
    var fromQuery;
    try {
      url = new URL(_href, readDocumentOrigin());
      fromQuery = url.searchParams.get(TOKEN_KEY);
      if (fromQuery === TOKEN_VALUE) return { status: "ok", present: true };
      return { status: "ok", present: readHashTokenValue(url.hash) === TOKEN_VALUE };
    } catch (_error) {
      return { status: "invalid", present: false };
    }
  }

  function readShareReadOnlyTokenPresent() {
    var candidates = [];
    var navigationName;
    var href;
    var index;
    var extracted;
    var attempted = 0;
    var invalidCount = 0;
    try {
      navigationName = readNavigationName();
      if (navigationName) candidates.push(navigationName);
      href = readDocumentHref();
      if (href) candidates.push(href);
      for (index = 0; index < candidates.length; index += 1) {
        attempted += 1;
        extracted = extractReadOnlyPresent(candidates[index]);
        if (extracted.status === "invalid") {
          invalidCount += 1;
          continue;
        }
        if (extracted.present) return true;
      }
      if (attempted > 0 && invalidCount === attempted) {
        console.warn("[shareControls.readShareReadOnlyTokenPresent] invalid URL candidates", { count: attempted });
      }
      return false;
    } catch (error) {
      console.warn("[shareControls.readShareReadOnlyTokenPresent] failed", error);
      return false;
    }
  }

  return readShareReadOnlyTokenPresent;
});
