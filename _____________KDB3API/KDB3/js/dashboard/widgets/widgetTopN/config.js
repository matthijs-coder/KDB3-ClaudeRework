define([], function () {
  "use strict";

  return {
    TOPN_PAD_KEY: "topN",
    PAD_ATTR: "data-kdb-launchpad-pad",
    CLAIM_OWNER_ATTR: "data-connected-vis-widget-id",
    CLAIM_TOKEN_ATTR: "data-kdb-topn-claim-token",
    NOTE_EDITABLE_SELECTOR: ".note-editable",
    CLAIM_CONFIRM_MS: 50,
    CLEANUP_KEY_PREFIX: "helperCleanup:",
    CLEANUP_SETTLE_TIMEOUT_MS: 5000,
    HELPER_READ_PICK: ["display", "use", "d", "u", "value", "v", "label", "caption"],
    DEFAULT_EXCLUDE_VALUES: ["Gesamt", "ALLE", "^"]
  };
});
