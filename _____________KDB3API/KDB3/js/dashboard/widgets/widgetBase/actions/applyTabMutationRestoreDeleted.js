define([
  "../effects/applyDeleteSlotStock.js"
], function (_applyDeleteSlotStock) {
  "use strict";

  async function applyTabMutationRestoreDeleted(_context, _payload, _plan, _snapshot, _parked, _moved) {
    try {
      return await _applyDeleteSlotStock.applyRestoreDeleted(_context, _payload, _plan, _snapshot, _parked, _moved);
    } catch (err) {
      console.error("[widgetBase.applyTabMutationRestoreDeleted] failed", err);
      throw err;
    }
  }

  return { applyTabMutationRestoreDeleted: applyTabMutationRestoreDeleted };
});
