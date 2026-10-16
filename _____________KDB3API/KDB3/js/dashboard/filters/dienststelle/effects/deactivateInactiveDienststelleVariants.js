define([
  "../config/actions.js",
  "../config/dienststelleDefinitions.js",
  "./ensureDienststelleRuntime.js",
  "./clearDienststelleHostFilter.js",
  "../view/syncDienststelleWrapperClasses.js"
], function (
  _actions,
  _definitions,
  _ensureRuntime,
  _clearHostFilter,
  _syncWrapperClasses
) {
  "use strict";

  function dispatchInactiveStatus(_dispatchInternal, _definition) {
    _dispatchInternal({
      type: _actions.FILTER_STATUS_CHANGED,
      payload: {
        filterKey: _definition.activeFilterKey,
        visibleFilterLabel: _definition.visibleFilterLabel,
        status: "inactive",
        isActive: false
      }
    });
  }

  function dispatchInactiveClearError(_dispatchInternal, _definition, _result) {
    var remaining = _result && _result.remainingScopes ? _result.remainingScopes.join(", ") : "";
    var failed = _result && _result.failedScopes ? _result.failedScopes.join(", ") : "";
    console.warn(
      "[dienststelle.deactivateInactiveDienststelleVariants] inactive clear failed",
      _definition.activeFilterKey,
      { failedScopes: failed, remainingScopes: remaining }
    );
    _dispatchInternal({
      type: _actions.FILTER_STATUS_CHANGED,
      payload: {
        filterKey: _definition.activeFilterKey,
        visibleFilterLabel: _definition.visibleFilterLabel,
        status: "error",
        isActive: false,
        errorCode: "DIENSTSTELLE_INACTIVE_CLEAR_FAILED",
        errorMessage:
          "Inactive Dienststelle variant could not be cleared in Cognos host (" +
          _definition.activeFilterKey +
          ")."
      }
    });
  }

  function deactivateOneVariant(_KDB, _dispatchInternal, _definition) {
    return _clearHostFilter(_KDB, _definition.activeFilterKey).then(function (_result) {
      if (_result && _result.ok === true) {
        dispatchInactiveStatus(_dispatchInternal, _definition);
        return;
      }
      dispatchInactiveClearError(_dispatchInternal, _definition, _result);
    });
  }

  function deactivateInactiveDienststelleVariants(_KDB, _dispatchInternal, _activeDefinition) {
    var runtime = _ensureRuntime(_KDB);
    var keys = Object.keys(_definitions);
    var idx;
    var definition;
    var chain = Promise.resolve();
    if (!_activeDefinition || !_activeDefinition.activeFilterKey) {
      return Promise.resolve();
    }
    for (idx = 0; idx < keys.length; idx += 1) {
      definition = _definitions[keys[idx]];
      if (definition.activeFilterKey === _activeDefinition.activeFilterKey) {
        continue;
      }
      chain = chain.then(deactivateOneVariant.bind(null, _KDB, _dispatchInternal, definition));
    }
    return chain.then(function () {
      _syncWrapperClasses.syncDienststelleWrapperClasses(runtime, _activeDefinition, _KDB);
    });
  }

  return deactivateInactiveDienststelleVariants;
});
