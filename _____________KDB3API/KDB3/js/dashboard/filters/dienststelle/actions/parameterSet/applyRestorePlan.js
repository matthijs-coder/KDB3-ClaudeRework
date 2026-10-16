define([
  "../../config/parameterSetCodes.js",
  "../restoreSupport.js",
  "../../effects/dienststelleScopeApplySupport.js"
], function (_codes, _support, _scopeSupport) {
  "use strict";

  function describeWriteFailure(_outcome) {
    if (!_outcome) { return "writeFilter returned nothing"; }
    if (_outcome.diagnostics && _outcome.diagnostics[0] && _outcome.diagnostics[0].message) {
      return _outcome.diagnostics[0].message;
    }
    return String(_outcome.errorCode || _outcome.reason || _outcome.outcome);
  }

  // Restore-only Cognos apply step: writes the validated plan values per scope
  // via the cognosHost filters facet. Only reachable from parameterSetRestore.
  async function applyRestorePlan(_ctx, _active, _plan, _diagnostics) {
    var filtersFacet = _ctx.filtersFacet;
    var result = { requiredOk: true, appliedScopes: [], fallbackScopes: [], missingValues: [] };
    var idx;
    var item;
    var ref;
    var values;
    var outcome;
    try {
      if (!filtersFacet) {
        _diagnostics.push({ code: _codes.RESTORE_FAILED, message: "dienststelle cognos filter API is unavailable" });
        return { requiredOk: false, appliedScopes: [], fallbackScopes: [], missingValues: [] };
      }
      for (idx = 0; idx < _plan.length; idx += 1) {
        item = _plan[idx];
        ref = _support.lookupScopeFilterRef(_ctx._KDB, _active.activeFilterKey, item.scope);
        if (!ref) {
          result.requiredOk = item.scope !== "global" && result.requiredOk;
          if (item.scope === "global") { break; }
          continue;
        }
        result.missingValues = result.missingValues.concat(item.missing);
        values = item.valid.length ? item.valid : item.fallback ? [item.fallback] : [];
        if (values.length === 0) {
          result.requiredOk = item.scope !== "global" && result.requiredOk;
          if (item.scope === "global") { break; }
          continue;
        }
        outcome = await filtersFacet.writeFilter({
          ref: ref,
          values: _scopeSupport.toCognosValues(values)
        });
        if (!outcome || outcome.ok !== true) {
          _diagnostics.push({
            code: _codes.RESTORE_FAILED,
            scope: item.scope,
            message: "cognos apply failed: " + describeWriteFailure(outcome)
          });
          result.requiredOk = item.scope !== "global" && result.requiredOk;
          if (item.scope === "global") { break; }
          continue;
        }
        if (item.valid.length > 0) { result.appliedScopes.push(item.scope); }
        else { result.fallbackScopes.push(item.scope); }
      }
      return result;
    } catch (error) {
      console.error("[dienststelle.applyRestorePlan] failed", error);
      throw error;
    }
  }

  return applyRestorePlan;
});
