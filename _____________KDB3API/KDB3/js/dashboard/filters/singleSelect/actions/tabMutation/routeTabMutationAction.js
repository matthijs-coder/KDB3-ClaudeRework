define([
  "../../tabMutation/prepare.js",
  "../../tabMutation/apply.js",
  "../../tabMutation/restore.js",
  "../../tabMutation/resync.js"
], function (_prepare, _apply, _restore, _resync) {
  "use strict";

  return {
    handlePrepare: _prepare.prepareTabMutation,
    handleApply: _apply.applyTabMutation,
    handleRestore: _restore.restoreTabMutationSnapshot,
    handleResync: _resync.resyncTabMutationHost
  };
});
