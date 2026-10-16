define([], function () {
  "use strict";
  // Grandfather German keys aktualisierungsDatumRaw / aktualisierungsDatumFormatted
  // (PO lock; UI strings stay German; new files English).
  // createdUserName is English (new).
  function createInitialFooterState() {
    return {
      status: "idle",
      aktualisierungsDatumRaw: null,
      aktualisierungsDatumFormatted: null,
      createdUserName: null
    };
  }
  return createInitialFooterState;
});
