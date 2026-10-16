define([], function () {
  "use strict";

  // Published as _KDB.elements.selectors.launchpad (read by widgetBase); keep the three keys.
  const DOM_SELECTORS = {
    hideSpotSelector: "#KDB_HideSpot",
    rootSelector: "#KDB_widgetLaunchpad",
    slotSelector: "[data-kdb-launchpad-pad][cor_page_id][cor_page_index]"
  };

  const PAD_CONFIG = {
    visualization: { padKey: "visualization", elementId: "KDB_visualizationLaunchpad" },
    text: { padKey: "text", elementId: "KDB_textLaunchpad" },
    dataTables: { padKey: "dataTables", elementId: "KDB_dataTablesPad" },
    topN: { padKey: "topN", elementId: "KDB_topNPad" },
    otherResources: { padKey: "otherResources", elementId: "KDB_otherResourcesPad" }
  };

  const ACTION_TYPES = {
    MOUNT_STARTED: "launchpad/mountStarted",
    MOUNT_SUCCEEDED: "launchpad/mountSucceeded",
    MOUNT_FAILED: "launchpad/mountFailed",
    DESTROY: "launchpad/destroy",
    WAIT_UNTIL_READY: "launchpad/waitUntilReady",
    READ_SLOT_WIDGETS: "launchpad/readSlotWidgets"
  };

  return {
    DOM_SELECTORS: DOM_SELECTORS,
    PAD_CONFIG: PAD_CONFIG,
    ACTION_TYPES: ACTION_TYPES
  };
});
