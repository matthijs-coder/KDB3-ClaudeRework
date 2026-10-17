define([
  "../../schema/errorCodes.js",
  "./classifyV2FilterItem.js",
  "./extractV2FilterValues.js",
], function (_errorCodes, _classifyV2FilterItem, _extractV2FilterValues) {
  "use strict";

  function resolveDstlKey(_name, _sichtValue) {
    const lower = String(_name || "").trim().toLowerCase();
    if (lower.indexOf("dezpv") !== -1) {
      return "Dienststelle_DEZPV";
    }
    if (lower.indexOf("_bw") !== -1 || lower === "dienststelle_bw") {
      return "Dienststelle_BW";
    }
    const sicht = String(_sichtValue || "").toUpperCase();
    if (sicht.indexOf("DEZPV") !== -1) {
      return "Dienststelle_DEZPV";
    }
    return "Dienststelle_BW";
  }

  function ensureDstl(_state, _key) {
    if (!_state.dstl) {
      _state.dstl = { key: _key, glob: [], byTab: {} };
    }
    if (!_state.dstl.key) {
      _state.dstl.key = _key;
    }
    return _state.dstl;
  }

  function pushUnique(_array, _values) {
    for (let index = 0; index < _values.length; index += 1) {
      if (_array.indexOf(_values[index]) === -1) {
        _array.push(_values[index]);
      }
    }
  }

  function mapFilterEntry(_state, _identityName, _valuesArray, _tabIdx, _filterPropObj, _diagnostics) {
    const classification = _classifyV2FilterItem(_filterPropObj, _identityName, _valuesArray);
    if (classification.kind === "unsupported") {
      _diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_FILTER_KIND_UNSUPPORTED,
        "map",
        "v2 filter kind is not supported in v3 map",
        { name: _identityName }
      ));
      return;
    }
    if (classification.kind === "sicht") {
      const values = _extractV2FilterValues.extractDValues(_valuesArray);
      if (values.length > 0) {
        _state.sicht = values[0];
      }
      return;
    }
    if (classification.kind === "dstl") {
      const labels = _extractV2FilterValues.remapBwLabels(
        _extractV2FilterValues.extractDValues(_valuesArray),
        _diagnostics
      );
      if (labels.length === 0) {
        return;
      }
      const key = resolveDstlKey(_identityName, _state.sicht);
      const dstl = ensureDstl(_state, key);
      if (_tabIdx === null) {
        pushUnique(dstl.glob, labels);
      } else {
        const tabKey = String(_tabIdx);
        if (!dstl.byTab[tabKey]) {
          dstl.byTab[tabKey] = [];
        }
        pushUnique(dstl.byTab[tabKey], labels);
      }
      return;
    }
    if (classification.kind === "sels") {
      const vals = _extractV2FilterValues.extractDValues(_valuesArray);
      if (vals.length === 0) {
        return;
      }
      const entry = { key: classification.key, vals: vals };
      if (_tabIdx !== null) {
        entry.tab = _tabIdx;
      }
      _state.sels.push(entry);
      return;
    }
    if (classification.kind === "pcfs") {
      const vals = _extractV2FilterValues.extractPcfsVals(_valuesArray);
      if (vals.length === 0) {
        return;
      }
      const entry = { nm: classification.nm, vals: vals };
      if (_tabIdx !== null) {
        entry.tab = _tabIdx;
      }
      _state.pcfs.push(entry);
    }
  }

  return { mapFilterEntry: mapFilterEntry };
});
