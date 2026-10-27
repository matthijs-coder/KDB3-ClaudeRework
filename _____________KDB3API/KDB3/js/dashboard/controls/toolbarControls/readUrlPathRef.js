define([], function () {
  "use strict";

  function readNavigationName() {
    var entries;
    if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return null;
    entries = performance.getEntriesByType("navigation");
    return entries && entries[0] && entries[0].name ? entries[0].name : null;
  }

  function readDocumentLocation() {
    return typeof document !== "undefined" && document.location ? document.location : null;
  }

  function readHashValue(hash, key) {
    var stripped = String(hash || "").replace(/^#/, "");
    var part;
    var value;
    if (!stripped) return null;
    part = stripped.indexOf("?") !== -1 ? stripped.split("?")[1] : stripped;
    value = new URLSearchParams(part).get(key);
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  function readCandidateValue(href, origin, key) {
    var url;
    var queryValue;
    var hashValue;
    try {
      url = new URL(href, origin);
    } catch (_error) {
      return { status: "invalid", value: null };
    }
    queryValue = url.searchParams.get(key);
    if (typeof queryValue === "string" && queryValue.length > 0) return { status: "ok", value: queryValue };
    hashValue = readHashValue(url.hash, key);
    if (typeof hashValue === "string" && hashValue.length > 0) return { status: "ok", value: hashValue };
    return { status: "ok", value: null };
  }

  function readUrlValue(key) {
    var location = readDocumentLocation();
    var candidates = [readNavigationName(), location && location.href].filter(Boolean);
    var origin = (location && location.origin) || undefined;
    var index;
    var extracted;
    var attempted = 0;
    var invalidCount = 0;
    for (index = 0; index < candidates.length; index += 1) {
      attempted += 1;
      extracted = readCandidateValue(candidates[index], origin, key);
      if (extracted.status === "invalid") {
        invalidCount += 1;
        continue;
      }
      if (extracted.value) return extracted.value;
    }
    if (attempted > 0 && invalidCount === attempted) {
      console.warn("[shareControls.readUrlPathRef] invalid URL candidates", { count: attempted });
    }
    return null;
  }

  function readUrlPathRef() {
    return readUrlValue("pathRef");
  }

  function readUrlSubView() {
    return readUrlValue("subView");
  }

  return { readUrlPathRef: readUrlPathRef, readUrlSubView: readUrlSubView };
});
