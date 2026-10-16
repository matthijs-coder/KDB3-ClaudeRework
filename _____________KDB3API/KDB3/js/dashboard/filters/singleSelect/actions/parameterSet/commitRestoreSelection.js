define([
  "../../effects/commitSelectionState.js",
  "../../config.js"
], function (
  _commitSelectionState,
  _config
) {
  "use strict";

  function commitRestoreSelection(_canonicalInstance, _root, _args) {
    try {
      if (!_args.useValue) {
        return commitEmptyRestore(_canonicalInstance, _root);
      }
      return commitObservedRestore(_canonicalInstance, _root, _args);
    } catch (error) {
      console.error("[singleSelect.commitRestoreSelection] failed", {
        filterInstanceId: _args && _args.filterInstanceId
      }, error);
      throw error;
    }
  }

  function commitEmptyRestore(_canonicalInstance, _root) {
    _commitSelectionState.applyConfirmedState(_canonicalInstance, _root, {
      displayValue: "Alle", useValue: "", displaySource: "policy"
    });
    return { committed: true, degraded: false, diagnostic: null };
  }

  function commitObservedRestore(_canonicalInstance, _root, _args) {
    var observed = _args.observed;
    var resolved = _args.resolved;
    var useValue = _args.useValue;
    var observedDisplay = observed[0].d == null ? null : String(observed[0].d);
    var resolvedD = resolved.selection && resolved.selection.d != null
      ? String(resolved.selection.d)
      : null;
    if (resolved.degraded === false && resolvedD != null && observedDisplay !== resolvedD) {
      _commitSelectionState.applyConfirmedState(_canonicalInstance, _root, {
        displayValue: resolvedD,
        useValue: String(observed[0].u),
        displaySource: "table"
      });
      return { committed: true, degraded: false, diagnostic: null };
    }
    var transportOnly = resolved.degraded === true &&
      (observedDisplay === null || observedDisplay === useValue);
    var displayUnavailable = observedDisplay === null;
    _commitSelectionState.applyConfirmedState(_canonicalInstance, _root, {
      displayValue: transportOnly ? null : observedDisplay,
      useValue: String(observed[0].u),
      displaySource: transportOnly || displayUnavailable ? "unavailable" : "cognos"
    });
    return {
      committed: true,
      degraded: transportOnly || displayUnavailable,
      diagnostic: transportOnly ? resolved.diagnostic : (displayUnavailable ? {
        code: _config.parameterSetCodes.DISPLAY_DEGRADED,
        filterInstanceId: _args.filterInstanceId,
        message: "host reread confirmed use value without an independent display value"
      } : null)
    };
  }

  return commitRestoreSelection;
});
