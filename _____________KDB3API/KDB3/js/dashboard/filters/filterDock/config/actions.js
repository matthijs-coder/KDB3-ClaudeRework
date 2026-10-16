define([], function () {
  "use strict";

  return {
    MOUNT_SUCCEEDED: "filterDock/mountSucceeded",
    CLICK_OBSERVED: "filterDock/clickObserved",
    MUTATIONS_OBSERVED: "filterDock/mutationsObserved",
    POPUP_OBSERVED: "filterDock/popupObserved",
    FILTERS_READY_OBSERVED: "filterDock/filtersReadyObserved",
    FILTERS_READY_DIAGNOSTIC_OBSERVED: "filterDock/filtersReadyDiagnosticObserved",
    EVALUATION_SCHEDULED: "filterDock/evaluationScheduled",
    EVALUATION_FINISHED: "filterDock/evaluationFinished",
    ERROR: "filterDock/error",
    DESTROY: "filterDock/destroy",
    CLICK_ORIGINAL_BUTTON_REQUESTED: "filterDock/clickOriginalButtonRequested",
    CLOSE_ACTIVE_POPUP_REQUESTED: "filterDock/closeActivePopupRequested"
  };
});
