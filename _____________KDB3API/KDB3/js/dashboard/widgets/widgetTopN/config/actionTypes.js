define([], function () {
  "use strict";

  return {
    RESOLVE_REQUESTED: "widgetTopN/resolveRequested",
    CLEANUP: "widgetTopN/cleanup",
    ERROR: "widgetTopN/error",
    MOUNT_STARTED: "widgetTopN/mountStarted",
    MOUNT_SUCCEEDED: "widgetTopN/mountSucceeded",
    MARK_PENDING: "widgetTopN/markPending",
    HELPER_CLAIMED: "widgetTopN/helperClaimed",
    RESOLUTION_SUCCEEDED: "widgetTopN/resolutionSucceeded",
    NO_HELPER_AVAILABLE: "widgetTopN/noHelperAvailable",
    ERROR_RECORDED: "widgetTopN/errorRecorded",
    CLEANUP_SUCCEEDED: "widgetTopN/cleanupSucceeded",
    DESTROY: "widgetTopN/destroy"
  };
});
