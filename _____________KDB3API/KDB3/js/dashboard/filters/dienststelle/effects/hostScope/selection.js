define([
  "../../view/labels.js",
  "./filterRef.js"
], function (_labels, _filterRef) {
  "use strict";

  var REQUIRED_STABLE_READS = 2;
  var POLL_INTERVAL_MS = 50;
  var TIMEOUT_MS = 2000;
  var waitForMissingLogged = false;

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
    var sanitized = _labels.sanitizeVisibleLabel(display);
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
  function readFilterValues(_ref, _filtersFacet) {
    var outcome;
    var values;
    var mapped;
    var idx;
    var item;
    try {
      if (!_ref || !_filtersFacet) {
        return null;
      }
      outcome = _filtersFacet.readFilterValues(_ref);
      if (!outcome || outcome.ok !== true) {
        // The facet never throws; a failed or aborted read maps onto the same
        // null the host-throw path produced before the migration.
        if (outcome && outcome.outcome === "failed") {
          console.warn("[dienststelle.readFilterValues] host read failed", outcome.errorCode);
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
      console.warn("[dienststelle.readFilterValues] failed", error);
      return null;
    }
  }

  function collectUseValueSet(_values) {
    var seen = {};
    var out = [];
    var idx;
    var item;
    var key;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      item = _values[idx];
      if (!item || item.useValue == null) {
        continue;
      }
      key = String(item.useValue);
      if (seen[key]) {
        continue;
      }
      seen[key] = true;
      out.push(key);
    }
    return out;
  }

  function sameUseValueSet(_left, _right) {
    var left = collectUseValueSet(_left);
    var right = collectUseValueSet(_right);
    var seen = {};
    var idx;
    if (left.length !== right.length) {
      return false;
    }
    for (idx = 0; idx < left.length; idx += 1) {
      seen[left[idx]] = true;
    }
    for (idx = 0; idx < right.length; idx += 1) {
      if (!seen[right[idx]]) {
        return false;
      }
    }
    return true;
  }

  function matchesExpected(_observed, _expected) {
    var targetValues;
    if (!_expected || _expected.mode === "empty") {
      return _observed == null;
    }
    if (_expected.mode !== "values") {
      return false;
    }
    targetValues = _expected.values;
    if (!Array.isArray(targetValues) || !targetValues.length) {
      return _observed == null;
    }
    if (_observed == null) {
      return false;
    }
    return sameUseValueSet(_observed, targetValues);
  }

  function readScopeSelection(_KDB, _activeFilterKey, _scopeId, _filtersFacet) {
    var ref =
      _scopeId === "global"
        ? _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "global", null)
        : _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", _scopeId);
    if (!ref) {
      return null;
    }
    return readFilterValues(ref, _filtersFacet);
  }

  function waitForStableScopeValues(_KDB, _activeFilterKey, _scopeId, _filtersFacet, _expected) {
    var waitForFn = _KDB && _KDB.utils ? _KDB.utils.waitFor : null;
    var stableCount = 0;
    var lastObserved = null;

    function pollStableCount() {
      lastObserved = readScopeSelection(_KDB, _activeFilterKey, _scopeId, _filtersFacet);
      if (matchesExpected(lastObserved, _expected)) {
        stableCount += 1;
      } else {
        stableCount = 0;
      }
      return stableCount;
    }

    if (typeof waitForFn !== "function") {
      if (!waitForMissingLogged) {
        waitForMissingLogged = true;
        console.warn("[dienststelle.waitForStableScopeValues] waitFor missing");
      }
      pollStableCount();
      return Promise.resolve({
        stable: stableCount >= REQUIRED_STABLE_READS,
        lastObserved: lastObserved
      });
    }

    return Promise.resolve(
      waitForFn(pollStableCount, {
        interval: POLL_INTERVAL_MS,
        timeoutMs: TIMEOUT_MS,
        predicate: function (_count) {
          return _count >= REQUIRED_STABLE_READS;
        }
      })
    )
      .then(function () {
        return { stable: true, lastObserved: lastObserved };
      })
      .catch(function () {
        return { stable: false, lastObserved: lastObserved };
      });
  }

  return {
    readFilterValues: readFilterValues,
    waitForStableScopeValues: waitForStableScopeValues
  };
});
