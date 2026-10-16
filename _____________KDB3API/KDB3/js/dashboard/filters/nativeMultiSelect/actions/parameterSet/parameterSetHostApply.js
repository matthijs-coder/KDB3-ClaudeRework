define([
  "../../effects/lookupNativeMultiSelectRef.js",
  "../../effects/lookupNativeMultiSelectRefByName.js",
  "../../config/parameterSetCodes.js"
], function (_lookupNativeMultiSelectRef, _lookupNativeMultiSelectRefByName, _codes) {
  "use strict";

  function warnSkip(_kind, _details) {
    console.warn("[nativeMultiSelect." + _kind + "] dest item skipped", _details);
  }

  function pushMeta(_diag, _meta) {
    if (!_meta) { return _diag; }
    Object.keys(_meta).forEach(function (key) { _diag[key] = _meta[key]; });
    return _diag;
  }

  function describeFailure(_outcome) {
    if (!_outcome) { return "host apply API unavailable"; }
    if (_outcome.diagnostics && _outcome.diagnostics[0] && _outcome.diagnostics[0].message) {
      return _outcome.diagnostics[0].message;
    }
    return String(_outcome.errorCode || _outcome.reason || _outcome.outcome);
  }

  // Keeps the existing three-value dialect: a missing dest item stays "skipped"
  // with the by-design code, every other non-ok outcome is "failed".
  async function applyReplace(_filtersFacet, _filterRef, _values, _diagnostics, _failCode, _meta) {
    var outcome;
    if (!_filtersFacet) {
      _diagnostics.push(pushMeta({ code: _failCode, message: "host apply API unavailable" }, _meta));
      return "failed";
    }
    outcome = await _filtersFacet.writeFilter({ ref: _filterRef, values: _values || [] });
    if (!outcome || outcome.ok !== true) {
      _diagnostics.push(pushMeta({ code: _failCode, message: describeFailure(outcome) }, _meta));
      return "failed";
    }
    return "applied";
  }

  async function applyByItemId(_KDB, _itemId, _scopeId, _values, _diagnostics, _filtersFacet) {
    var itemId = String(_itemId || "").trim();
    var scopeId = String(_scopeId || "").trim();
    var filterRef = _lookupNativeMultiSelectRef(_KDB, itemId, scopeId, _filtersFacet);
    if (!filterRef) {
      warnSkip("applyByItemId", { itemId: itemId, scopeId: scopeId });
      _diagnostics.push({ code: _codes.SKIPPED, itemId: itemId, scopeId: scopeId, message: "dest host item missing" });
      return "skipped";
    }
    var failCode = (!_values || _values.length === 0) ? _codes.CLEAR_FAILED : _codes.RESTORE_FAILED;
    return applyReplace(_filtersFacet, filterRef, _values, _diagnostics, failCode, { itemId: itemId, scopeId: scopeId });
  }

  async function applyByName(_KDB, _itemName, _scopeId, _values, _diagnostics, _filtersFacet) {
    var itemName = String(_itemName || "").trim();
    var scopeId = String(_scopeId || "").trim();
    var filterRef = _lookupNativeMultiSelectRefByName(_KDB, itemName, scopeId, _filtersFacet);
    if (!filterRef) {
      warnSkip("applyByName", { itemName: itemName, scopeId: scopeId });
      _diagnostics.push({ code: _codes.SKIPPED, itemName: itemName, scopeId: scopeId, message: "dest host item missing" });
      return "skipped";
    }
    return applyReplace(_filtersFacet, filterRef, _values, _diagnostics, _codes.RESTORE_FAILED, { itemName: itemName, scopeId: scopeId });
  }

  return Object.freeze({ applyByItemId: applyByItemId, applyByName: applyByName });
});
