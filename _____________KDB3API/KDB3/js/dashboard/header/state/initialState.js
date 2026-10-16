define([], function () {
  "use strict";
  /** CP-1 shape (header.md §2.1). Field `status` is domain chrome presence, not module `lifecycle`. */
  function createInitialHeaderState() {
    return {
      status: "idle",
      subtitleStatus: "removed",
      titleText: "",
      subtitleText: "",
      iconKey: "Stadt-wien",
      activeEditableTarget: null,
      editTarget: null,
      editStatus: "idle",
      pendingEdit: null,
      draftTitleText: "",
      draftSubtitleText: "",
    };
  }
  return createInitialHeaderState;
});
