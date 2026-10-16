define([
  "./config.js",
  "./inventory.js"
], function (_config, _inventory) {
  "use strict";

  var codes = _config.parameterSetCodes;

  function warnDestSkip(_kind, _details) {
    console.warn("[nativeMultiSelect." + _kind + "] dest item skipped", _details);
  }

  function describeFailure(_outcome) {
    if (!_outcome) { return "host apply API unavailable"; }
    if (_outcome.diagnostics && _outcome.diagnostics[0] && _outcome.diagnostics[0].message) {
      return _outcome.diagnostics[0].message;
    }
    return String(_outcome.errorCode || _outcome.reason || _outcome.outcome);
  }

  // Replaces the values of one host item. A facet outcome that is not ok comes back as a message; a rejected
  // writeFilter propagates to the caller's boundary.
  async function writeRef(_filtersFacet, _ref, _values) {
    var outcome = await _filtersFacet.writeFilter({ ref: _ref, values: _values || [] });
    if (!outcome || outcome.ok !== true) {
      return { ok: false, message: describeFailure(outcome) };
    }
    return { ok: true, message: "" };
  }

  function pushMeta(_diag, _meta) {
    Object.keys(_meta).forEach(function (key) { _diag[key] = _meta[key]; });
    return _diag;
  }

  // Keeps the three-value dialect of the parameterSet runs: a missing dest item is "skipped" with the
  // by-design code, every other non-ok outcome is "failed".
  async function applyReplace(_filtersFacet, _filterRef, _values, _diagnostics, _failCode, _meta) {
    var written = await writeRef(_filtersFacet, _filterRef, _values);
    if (!written.ok) {
      _diagnostics.push(pushMeta({ code: _failCode, message: written.message }, _meta));
      return "failed";
    }
    return "applied";
  }

  async function applyByItemId(_KDB, _itemId, _scopeId, _values, _diagnostics, _filtersFacet) {
    var itemId = String(_itemId || "").trim();
    var scopeId = String(_scopeId || "").trim();
    var filterRef = _inventory.lookupRef(_KDB, itemId, scopeId, _filtersFacet);
    if (!filterRef) {
      warnDestSkip("applyByItemId", { itemId: itemId, scopeId: scopeId });
      _diagnostics.push({ code: codes.SKIPPED, itemId: itemId, scopeId: scopeId, message: "dest host item missing" });
      return "skipped";
    }
    var failCode = (!_values || _values.length === 0) ? codes.CLEAR_FAILED : codes.RESTORE_FAILED;
    return applyReplace(_filtersFacet, filterRef, _values, _diagnostics, failCode, { itemId: itemId, scopeId: scopeId });
  }

  async function applyByName(_KDB, _itemName, _scopeId, _values, _diagnostics, _filtersFacet) {
    var itemName = String(_itemName || "").trim();
    var scopeId = String(_scopeId || "").trim();
    var filterRef = _inventory.lookupRefByName(_KDB, itemName, scopeId, _filtersFacet);
    if (!filterRef) {
      warnDestSkip("applyByName", { itemName: itemName, scopeId: scopeId });
      _diagnostics.push({ code: codes.SKIPPED, itemName: itemName, scopeId: scopeId, message: "dest host item missing" });
      return "skipped";
    }
    return applyReplace(_filtersFacet, filterRef, _values, _diagnostics, codes.RESTORE_FAILED, { itemName: itemName, scopeId: scopeId });
  }

  return {
    warnDestSkip: warnDestSkip,
    describeFailure: describeFailure,
    writeRef: writeRef,
    applyByItemId: applyByItemId,
    applyByName: applyByName
  };
});
