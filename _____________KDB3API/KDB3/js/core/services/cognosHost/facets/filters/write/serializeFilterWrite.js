define([
  "../../../runtime/ensureCognosHostRuntime.js"
], function (_ensureCognosHostRuntime) {
  "use strict";

  // Second line of M4 defence (design doc section 3.6 point 5 / section 6.8):
  // conflicting host writes on the same filter key are chained. Resolve the
  // handle inside the chained work so a waiter never reuses a stale handle.

  var SEP = "\u001F";

  function writeKey(_descriptor) {
    var itemId;
    var itemName;
    if (!_descriptor) {
      return "";
    }
    itemId = _descriptor.itemId == null ? "" : String(_descriptor.itemId).trim();
    if (itemId) {
      return String(_descriptor.scopeType || "") + SEP + String(_descriptor.scopeId || "") +
        SEP + "id" + SEP + itemId;
    }
    itemName = _descriptor.itemName == null ? "" : String(_descriptor.itemName).trim();
    if (!itemName) {
      return "";
    }
    return String(_descriptor.scopeType || "") + SEP + String(_descriptor.scopeId || "") +
      SEP + "name" + SEP + itemName;
  }

  function ignorePreviousFailure() {
    return null;
  }

  function runWork(_work) {
    return _work();
  }

  function chainWrite(_previous, _work) {
    return Promise.resolve(_previous).catch(ignorePreviousFailure).then(runWork.bind(null, _work));
  }

  function ensureWriteSlots(_KDB) {
    var runtime = _ensureCognosHostRuntime(_KDB);
    runtime.pendingPromises = runtime.pendingPromises || {};
    runtime.pendingPromises.filterWritesByKey = runtime.pendingPromises.filterWritesByKey || {};
    return runtime.pendingPromises.filterWritesByKey;
  }

  async function __controller(_ctx, _descriptor, _work) {
    var slot = ensureWriteSlots(_ctx._KDB);
    var key = writeKey(_descriptor);
    var previous;
    var ours;
    if (!key) {
      return _work();
    }
    previous = slot[key];
    ours = chainWrite(previous, _work);
    slot[key] = ours;
    try {
      return await ours;
    } finally {
      if (slot[key] === ours) {
        delete slot[key];
      }
    }
  }

  return __controller;
});
