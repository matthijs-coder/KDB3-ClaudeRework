define([], function () {
  "use strict";

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

  function readHashParameterId(_hash) {
    var stripped;
    var queryPart;
    var params;
    var value;
    stripped = String(_hash || "").replace(/^#/, "");
    if (!stripped) return null;
    queryPart = stripped.indexOf("?") !== -1 ? stripped.split("?")[1] : stripped;
    params = new URLSearchParams(queryPart);
    value = params.get("parameterId");
    return value ? value : null;
  }

  function extractParameterId(_href) {
    var url;
    var fromQuery;
    try {
      url = new URL(_href, readDocumentOrigin());
      fromQuery = url.searchParams.get("parameterId");
      if (fromQuery) return { status: "ok", id: fromQuery };
      return { status: "ok", id: readHashParameterId(url.hash) };
    } catch (_error) {
      return { status: "invalid", id: null };
    }
  }

  function readUrlParameterId() {
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
        extracted = extractParameterId(candidates[index]);
        if (extracted.status === "invalid") {
          invalidCount += 1;
          continue;
        }
        if (extracted.id) return extracted.id;
      }
      if (attempted > 0 && invalidCount === attempted) {
        console.warn("[writebackBridge.readUrlParameterId] invalid URL candidates", { count: attempted });
      }
      return null;
    } catch (error) {
      console.warn("[writebackBridge.readUrlParameterId] failed", error);
      return null;
    }
  }

  return readUrlParameterId;
});
