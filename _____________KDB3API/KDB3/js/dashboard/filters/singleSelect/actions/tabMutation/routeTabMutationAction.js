define([
  "./prepareTabMutation.js",
  "./applyTabMutation.js",
  "./restoreTabMutationSnapshot.js",
  "./resyncTabMutationHost.js"
], function (_prepareTabMutation, _applyTabMutation, _restoreTabMutationSnapshot, _resyncTabMutationHost) {
  "use strict";

  function handlePrepare(_KDB, _runtime, _payload) {
    return _prepareTabMutation(_KDB, _runtime, _payload);
  }

  function handleApply(_KDB, _runtime, _payload) {
    return _applyTabMutation(_KDB, _runtime, _payload);
  }

  function handleRestore(_KDB, _runtime, _payload) {
    return _restoreTabMutationSnapshot(_KDB, _runtime, _payload);
  }

  function handleResync(_KDB, _runtime, _payload) {
    return _resyncTabMutationHost(_KDB, _runtime, _payload);
  }

  return {
    handlePrepare: handlePrepare,
    handleApply: handleApply,
    handleRestore: handleRestore,
    handleResync: handleResync
  };
});
