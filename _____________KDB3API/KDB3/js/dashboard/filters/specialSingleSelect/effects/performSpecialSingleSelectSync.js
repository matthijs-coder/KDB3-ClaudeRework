define([
  "../config/specialFilterDefinitions.js",
  "./readSpecialRightsFromTableData.js",
  "./syncOneSpecialFilter.js",
  "./syncSpecialSingleSelectRootClass.js"
], function (
  _specialFilterDefinitions,
  _readSpecialRightsFromTableData,
  _syncOneSpecialFilter,
  _syncSpecialSingleSelectRootClass
) {
  "use strict";

  function collectHintLabels(_results, _hintName, _field) {
    var labels = [];
    var idx;
    var result;
    var label;
    if (!Array.isArray(_results)) {
      return labels;
    }
    for (idx = 0; idx < _results.length; idx += 1) {
      result = _results[idx];
      label = result && result[_hintName] && result[_hintName][_field];
      if (typeof label === "string" && label !== "" && labels.indexOf(label) === -1) {
        labels.push(label);
      }
    }
    return labels;
  }

  async function performSpecialSingleSelectSync(_controller, _dispatchInternal, _signal, _syncOptions) {
    try {
      var options = _syncOptions || {};
      var root = _controller._KDB.state &&
        _controller._KDB.state.filters &&
        _controller._KDB.state.filters.specialSingleSelect;
      _syncSpecialSingleSelectRootClass.syncSpecialSingleSelectRootClass(
        root ? root.activeSichtValue : null
      );
      var alleRead = _readSpecialRightsFromTableData.readAlleRightFromTableData(_controller._KDB);
      var filterIds = Object.keys(_specialFilterDefinitions);
      var results = [];
      var diagnostics = [];
      var idx;
      for (idx = 0; idx < filterIds.length; idx += 1) {
        if (_controller.isDisposed || (_signal && _signal.aborted)) {
          return {
            ok: false,
            aborted: true,
            inventoryGeneration: options.inventoryGeneration,
            results: results,
            diagnostics: diagnostics,
            clearedRestoredValues: [],
            appliedDefaultLabels: []
          };
        }
        var result = await _syncOneSpecialFilter.syncOneSpecialFilter(
          _controller,
          _dispatchInternal,
          filterIds[idx],
          _specialFilterDefinitions[filterIds[idx]],
          alleRead,
          _signal,
          options
        );
        results.push(result);
        if (result && result.errorCode) {
          diagnostics.push({
            code: result.errorCode,
            filterId: result.filterId,
            message: result.errorMessage || result.errorCode
          });
        }
      }
      return {
        ok: diagnostics.length === 0,
        inventoryGeneration: options.inventoryGeneration,
        source: options.source || null,
        results: results,
        diagnostics: diagnostics,
        clearedRestoredValues: options.reason === "parameterRestore"
          ? collectHintLabels(results, "restoreClearHint", "filterLabel") : [],
        appliedDefaultLabels: options.reason === "parameterRestore"
          ? collectHintLabels(results, "restoreDefaultHint", "filterLabel") : []
      };
    } catch (_error) {
      console.error("[specialSingleSelect.performSpecialSingleSelectSync] failed", _error);
      throw _error;
    }
  }

  return {
    performSpecialSingleSelectSync: performSpecialSingleSelectSync
  };
});
