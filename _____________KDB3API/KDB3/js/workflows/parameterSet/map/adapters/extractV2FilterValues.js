define([
  "../../../../core/config/writebackErrorCodes.js",
  "../../../../core/config/mapping/bwOldToNewMap.js",
], function (_errorCodes, _bwOldToNewMap) {
  "use strict";

  function extractDValues(_valuesArray) {
    if (!Array.isArray(_valuesArray)) {
      return [];
    }
    const result = [];
    for (let index = 0; index < _valuesArray.length; index += 1) {
      const row = _valuesArray[index];
      if (row && typeof row.d === "string" && row.d.trim() !== "") {
        result.push(row.d.trim());
      }
    }
    return result;
  }

  function extractPcfsVals(_valuesArray) {
    if (!Array.isArray(_valuesArray)) {
      return [];
    }
    const result = [];
    for (let index = 0; index < _valuesArray.length; index += 1) {
      const row = _valuesArray[index];
      if (!row || typeof row.d !== "string" || row.d.trim() === ""
        || typeof row.u !== "string" || row.u.trim() === "") {
        continue;
      }
      result.push({ d: row.d.trim(), u: row.u.trim() });
    }
    return result;
  }

  function remapBwLabel(_label, _diagnostics) {
    const mapped = _bwOldToNewMap[_label];
    if (mapped && mapped !== _label) {
      return mapped;
    }
    if (mapped === undefined && _label !== "") {
      _diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_DIENSTSTELLE_BW_LABEL_UNMAPPED,
        "map",
        "Dienststelle BW label has no bwOldToNewMap entry; label kept on payload",
        { label: _label }
      ));
    }
    return _label;
  }

  function remapBwLabels(_labels, _diagnostics) {
    const result = [];
    for (let index = 0; index < _labels.length; index += 1) {
      result.push(remapBwLabel(_labels[index], _diagnostics));
    }
    return result;
  }

  return Object.freeze({
    extractDValues: extractDValues,
    extractPcfsVals: extractPcfsVals,
    remapBwLabels: remapBwLabels,
  });
});
