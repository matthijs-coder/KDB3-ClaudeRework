define([], function () {
  "use strict";

  var PREPARE_OWNERS = Object.freeze([
    "widgetBase", "singleSelect", "dienststelle", "nativeMultiSelect"
  ]);
  var FILTER_APPLY_OWNERS = Object.freeze([
    "singleSelect", "dienststelle", "nativeMultiSelect"
  ]);
  var RESYNC_OWNERS = Object.freeze([
    "singleSelect", "dienststelle", "nativeMultiSelect"
  ]);

  return Object.freeze({
    PREPARE_OWNERS: PREPARE_OWNERS,
    FILTER_APPLY_OWNERS: FILTER_APPLY_OWNERS,
    RESYNC_OWNERS: RESYNC_OWNERS,
    ROLLBACK_OWNERS: PREPARE_OWNERS,
    SNAPSHOT_OWNER_KEYS: PREPARE_OWNERS
  });
});
