define([
  "./validateSingleSelectDraftPayload.js"
], function (_validateDraftPayload) {
  "use strict";

  // Draft transitions mutate only pendingSelection and never notify downstream
  // owners or create history (contract §5).
  function handleSingleSelectDraftEvent(_KDB, _dispatchInternal, _payload, _actionType) {
    try {
      var payload = _payload || {};
      var validation = _validateDraftPayload(_KDB, payload, _actionType);
      if (validation.ok !== true) {
        return validation;
      }
      _dispatchInternal({
        type: _actionType,
        payload: {
          pendingSelection: {
            displayValue: validation.pendingDisplayValue
          },
          timestamp: validation.timestamp
        }
      });
      return { ok: true };
    } catch (error) {
      console.error("[sicht.handleSingleSelectDraftEvent] failed", { actionType: _actionType }, error);
      return {
        ok: false,
        code: "SICHT_DRAFT_HANDLE_FAILED",
        message: String(error && error.message ? error.message : error)
      };
    }
  }

  return handleSingleSelectDraftEvent;
});
