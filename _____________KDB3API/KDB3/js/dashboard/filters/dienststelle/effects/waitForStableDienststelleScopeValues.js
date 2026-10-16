define(["./readDienststelleHostSelection.js"], function (_hostSelection) {
  "use strict";

  var REQUIRED_STABLE_READS = 2;
  var POLL_INTERVAL_MS = 50;
  var TIMEOUT_MS = 2000;
  var waitForMissingLogged = false;

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
    var filterRef;
    filterRef =
      _scopeId === "global"
        ? _hostSelection.lookupFilterRef(_KDB, _activeFilterKey, "global", null)
        : _hostSelection.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", _scopeId);
    if (!filterRef) {
      return null;
    }
    return _hostSelection.readFilterValues(filterRef, _filtersFacet);
  }

  function waitForStableDienststelleScopeValues(_KDB, _activeFilterKey, _scopeId, _filtersFacet, _expected) {
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
        console.warn("[dienststelle.waitForStableDienststelleScopeValues] waitFor missing");
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

  return waitForStableDienststelleScopeValues;
});
