define([], function () {
  "use strict";

  function createWidgetBindingApplyDefaults() {
    return {
      timeouts: {
        vis: 12000,
        helper: 5000,
      },
      renderWaitDefaults: {
        vis: { waitForStart: true, intervalMs: 100 },
        helper: { waitForStart: false, intervalMs: 100 },
      },
    };
  }

  return createWidgetBindingApplyDefaults;
});
