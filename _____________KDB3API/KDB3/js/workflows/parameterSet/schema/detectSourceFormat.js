define([
  "./v3Defaults.js",
  "../../../core/utils/kit/data.js",
], function (_v3Defaults, _kitData) {
  "use strict";

  // detectSourceFormat per contracts/writeback.md §2.4 / §3:
  // classification only, no mapping logic. `normalizeBridgeSetInput` (via
  // `runBridgeSetRestore`) owns array-unwrap of
  // legacy payloads before detection (§3.3); a single-element array is still
  // classified defensively here without being mapped.
  //
  // Returns: "v3" | "v2" | "v0v1" | "unknown"
  function detectSourceFormat(raw) {
    let candidate = raw;

    if (typeof candidate === "string") {
      try {
        candidate = JSON.parse(candidate);
      } catch (error) {
        return "unknown";
      }
    }

    if (Array.isArray(candidate)) {
      if (candidate.length !== 1) {
        return "unknown";
      }
      candidate = candidate[0];
    }

    if (!candidate || typeof candidate !== "object") {
      return "unknown";
    }

    if (candidate.v === _v3Defaults.SCHEMA_VERSION) {
      return "v3"; // descriptive-key v3 (canv/sett/head/foot/filt/tabs/wgts)
    }

    // KDB2 legacy writeback JSON shape markers (§7 mapping matrix source fields).
    const hasV2Markers =
      _kitData.isObjectLike(candidate.configuration)
      || _kitData.isObjectLike(candidate.globalFiltersObj)
      || _kitData.isObjectLike(candidate.widgets)
      || _kitData.isObjectLike(candidate.topHeader)
      || _kitData.isObjectLike(candidate.bottomFooter)
      || Array.isArray(candidate.tabs);
    if (hasV2Markers) {
      return "v2";
    }

    // v0/v1 formats are provisional until real DWH samples exist (§7).
    // Without markers there is no reliable v0/v1 signature; classify unknown.
    return "unknown";
  }

  return detectSourceFormat;
});
