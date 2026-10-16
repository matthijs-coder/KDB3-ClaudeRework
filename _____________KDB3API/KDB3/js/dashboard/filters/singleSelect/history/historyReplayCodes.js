define([], function () {
  "use strict";

  // Failure codes for historyService-filterInstanceIdentity-contractdelta.md
  // §5, amendment 2026-08-10. STEP_INVALID reuses the generic step-validation
  // code named in that contract's §4 (`HISTORY_STEP_INVALID`); every other
  // code is namespaced under the singleSelect replay contribution.
  return {
    INSTANCE_MISSING: "SINGLE_SELECT_HISTORY_INSTANCE_MISSING",
    INSTANCE_AMBIGUOUS: "SINGLE_SELECT_HISTORY_INSTANCE_AMBIGUOUS",
    DISPLAY_UNAVAILABLE: "SINGLE_SELECT_HISTORY_DISPLAY_UNAVAILABLE",
    REPLAY_FAILED: "SINGLE_SELECT_HISTORY_REPLAY_FAILED",
    ROLLBACK_FAILED: "SINGLE_SELECT_HISTORY_ROLLBACK_FAILED",
    OWNER_NOTIFY_FAILED: "SINGLE_SELECT_HISTORY_OWNER_NOTIFY_FAILED",
    STEP_INVALID: "HISTORY_STEP_INVALID"
  };
});
