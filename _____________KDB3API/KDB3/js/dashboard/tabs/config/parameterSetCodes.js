define([], function () {
  "use strict";

  // Diagnostic codes for the tabs parameterSet dispatch surface per
  // contracts/tabs-parameterSetRestore-contractdelta.md §7.
  // WRITEBACK_* codes mirror the canonical writeback enum by string value
  // (owner modules do not import writeback schema; see header owner pattern).
  // TABS_* codes are owner-level and not part of the writeback enum.
  return {
    CANCELLED: "WRITEBACK_RESTORE_CANCELLED",
    NOT_READY: "WRITEBACK_TABS_NOT_READY",
    TARGET_MISSING: "WRITEBACK_TABS_TARGET_MISSING",
    SURPLUS_UNTOUCHED: "WRITEBACK_TABS_SURPLUS_UNTOUCHED",
    TRAVERSAL_FAILED: "WRITEBACK_TABS_TRAVERSAL_FAILED",
    MIN_VISIBLE_FORCED: "TABS_MIN_VISIBLE_FORCED",
    RENAME_FAILED: "TABS_RENAME_FAILED",
    LIVE_WIDGETS_READY_TIMEOUT: "TABS_LIVE_WIDGETS_READY_TIMEOUT"
  };
});
