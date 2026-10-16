define([
  "./writeAndVerifyInstanceSelection.js",
  "./hostFilterWrite.js"
], function (_writeAndVerify, _hostWrite) {
  "use strict";

  function buildValuesForWrite(_displayValue, _useValue, _displaySource) {
    var useValue = _useValue == null ? "" : String(_useValue);
    if (!useValue) {
      return [];
    }
    if (_displayValue === "Alle") {
      return [];
    }
    if (_displayValue === null && _displaySource === "unavailable") {
      return [{ d: useValue, u: useValue }];
    }
    return [{ d: _displayValue, u: useValue }];
  }

  function isUnavailableReplay(_value) {
    return _value.displaySource === "unavailable" && _value.displayValue === null;
  }

  async function writeUnavailableReplay(_filtersFacet, _filterRef, _useValue, _previousHostValues) {
    var useValue = _useValue == null ? "" : String(_useValue);
    var previous = Array.isArray(_previousHostValues) ? _previousHostValues : [];
    var observed;
    try {
      if (!(await _hostWrite.writeValues(_filtersFacet, _filterRef, useValue ? [{ d: useValue, u: useValue }] : []))) {
        return { ok: false };
      }
      observed = _hostWrite.readValues(_filtersFacet, _filterRef);
      if (!useValue) {
        return { ok: Array.isArray(observed) && observed.length === 0 };
      }
      if (!Array.isArray(observed) || !observed[0] || String(observed[0].u || "") !== useValue) {
        await _hostWrite.writeValues(_filtersFacet, _filterRef, previous);
        return { ok: false };
      }
      return { ok: true };
    } catch (error) {
      try {
        await _hostWrite.writeValues(_filtersFacet, _filterRef, previous);
      } catch (rollbackError) {
        console.error("[singleSelect.replayCommittedSelectionWrites] unavailable rollback threw", rollbackError);
      }
      return { ok: false };
    }
  }

  async function writeSelectionForReplay(_KDB, _runtime, _record, _value, _filtersFacet, _filterRef, _previousHostValues) {
    if (isUnavailableReplay(_value) && _filtersFacet) {
      return await writeUnavailableReplay(_filtersFacet, _filterRef, _value.useValue, _previousHostValues);
    }
    return await _writeAndVerify(
      _KDB,
      _runtime,
      _record.filterInstanceId,
      buildValuesForWrite(_value.displayValue, _value.useValue, _value.displaySource)
    );
  }

  return {
    writeSelectionForReplay: writeSelectionForReplay
  };
});
