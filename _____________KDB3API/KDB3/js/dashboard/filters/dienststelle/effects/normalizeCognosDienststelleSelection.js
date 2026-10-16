define(["../view/sanitizeDienststelleVisibleLabel.js"], function (_sanitizeLabel) {
  "use strict";

  function normalizeHostValue(_raw) {
    var display =
      _raw && _raw.d != null
        ? String(_raw.d)
        : _raw && _raw.display != null
          ? String(_raw.display)
          : "";
    var useValue =
      _raw && _raw.u != null
        ? String(_raw.u)
        : _raw && _raw.use != null
          ? String(_raw.use)
          : "";
    if (!display && !useValue) {
      return null;
    }
    var sanitized = _sanitizeLabel(display);
    console.info("[sicht-jahr] TEMP dienststelle value", {
      rawDisplay: display,
      sanitizedDisplay: sanitized,
      useValue: useValue,
      hasPipe: display.indexOf("|") !== -1,
      hasHash: display.indexOf("#") !== -1
    });
    return {
      displayValue: sanitized,
      useValue: useValue,
      source: "cognos",
      hostDisplay: display
    };
  }

  // Takes a flat ref and the cognosHost filters facet. Values are read live from
  // the host, not from an inventory snapshot, so a write by another owner is
  // visible to the next read.
  function readFilterValues(_filterRef, _filtersFacet) {
    var outcome;
    var values;
    var mapped;
    var idx;
    var item;
    try {
      if (!_filterRef || !_filtersFacet) {
        return null;
      }
      outcome = _filtersFacet.readFilterValues(_filterRef);
      if (!outcome || outcome.ok !== true) {
        // The facet never throws; a failed or aborted read maps onto the same
        // null the host-throw path produced before the migration.
        if (outcome && outcome.outcome === "failed") {
          console.warn(
            "[dienststelle.readDienststelleHostSelection.readFilterValues] host read failed",
            outcome.errorCode
          );
        }
        return null;
      }
      values = outcome.data;
      if (!Array.isArray(values) || !values.length) {
        return null;
      }
      mapped = [];
      for (idx = 0; idx < values.length; idx += 1) {
        item = normalizeHostValue(values[idx]);
        if (item) {
          mapped.push(item);
        }
      }
      if (!mapped.length) {
        return null;
      }
      return mapped;
    } catch (error) {
      console.warn(
        "[dienststelle.normalizeCognosDienststelleSelection.readFilterValues] failed",
        error
      );
      return null;
    }
  }

  return {
    normalizeHostValue: normalizeHostValue,
    readFilterValues: readFilterValues
  };
});
