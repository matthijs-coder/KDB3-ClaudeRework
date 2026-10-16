define([
  "./config/actionTypes.js",
  "./view/placeAllWidgetControls.js",
  "./view/applyWidgetSettingsButtonVisibility.js",
  "./runtime/cleanupWidgetControls.js",
  "./actions/handleSeedDefaults.js",
  "./actions/handleCommitColour.js",
  "./actions/handleParameterSetReset.js",
  "./actions/handleParameterSetRestoreBatch.js",
  "./effects/restoreCommittedSettingsOnHistoryReplay.js"
], function (_actionTypes, _placeAllWidgetControls, _applyWidgetSettingsButtonVisibility, _cleanupWidgetControls, _handleSeedDefaults, _handleCommitColour, _handleParameterSetReset, _handleParameterSetRestoreBatch, _restoreCommittedSettings) {
  function routeWidgetSettingsDispatch(_KDB, _action) {
    const action = _action || {};
    const payload = normalizeActionPayload(action);
    if (action.type === _actionTypes.PLACE_CONTROLS) {
      return _placeAllWidgetControls(_KDB, payload);
    }
    if (action.type === _actionTypes.APPLY_BUTTON_VISIBILITY) {
      return { ok: _applyWidgetSettingsButtonVisibility(_KDB, payload) === true };
    }
    if (action.type === _actionTypes.CLEANUP_WIDGET_CONTROLS) {
      return _cleanupWidgetControls(_KDB, payload);
    }
    if (action.type === _actionTypes.SEED_DEFAULTS) {
      return _handleSeedDefaults(_KDB, payload);
    }
    if (action.type === _actionTypes.COMMIT_COLOUR) {
      return _handleCommitColour(_KDB, payload);
    }
    if (action.type === _actionTypes.PARAMETER_SET_RESET) {
      return _handleParameterSetReset(_KDB, payload);
    }
    if (action.type === _actionTypes.PARAMETER_SET_RESTORE_BATCH) {
      return _handleParameterSetRestoreBatch(_KDB, payload);
    }
    if (action.type === _actionTypes.RESTORE_COMMITTED_SETTINGS) {
      return _restoreCommittedSettings(_KDB, payload);
    }
    return {
      ok: true,
      skipped: true,
      reasonCode: "SCAFFOLD_NOOP",
      actionType: action.type || null
    };
  }

  function normalizeActionPayload(_action) {
    return _action && _action.payload
      ? Object.assign({}, _action.payload, { widgetId: _action.widgetId || _action.payload.widgetId })
      : _action || {};
  }

  return routeWidgetSettingsDispatch;
});
