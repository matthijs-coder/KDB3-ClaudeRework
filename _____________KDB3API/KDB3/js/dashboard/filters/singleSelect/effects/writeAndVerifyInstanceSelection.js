define([
  "./resolveFilterRef.js",
  "./writeVerifiedSelection.js",
  "./readFiltersFacet.js",
  "../config.js"
], function (_resolveFilterRef, _writeVerifiedSelection, _readFiltersFacet, _config) {
  "use strict";

  async function __controller(_KDB, _runtime, _filterInstanceId, _values) {
    try {
      var filtersFacet = _readFiltersFacet(_KDB, _runtime);
      var filterRef = _resolveFilterRef.resolveFilterRef(
        _KDB, _runtime, { filterInstanceId: _filterInstanceId }
      );
      if (!filtersFacet || !filterRef) {
        return { ok: false, errorCode: _config.errorCodes.HOST_WRITE_FAILED };
      }
      var result = await _writeVerifiedSelection(filtersFacet, filterRef, _values, {
        verifyRollback: false
      });
      return {
        ok: result.ok === true,
        errorCode: result.ok === true ? null : (result.errorCode || _config.errorCodes.HOST_WRITE_FAILED)
      };
    } catch (error) {
      console.error("[singleSelect.writeAndVerifyInstanceSelection] failed", {
        filterInstanceId: _filterInstanceId
      }, error);
      return { ok: false, errorCode: _config.errorCodes.HOST_WRITE_FAILED };
    }
  }

  return __controller;
});
