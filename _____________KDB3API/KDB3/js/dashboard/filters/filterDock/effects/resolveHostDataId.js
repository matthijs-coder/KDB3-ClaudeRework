define(["./readFilterLabel.js"], function (_readFilterLabel) {
  "use strict";

  var VARIANT_HOST_IDS = {
    Dienststelle_BW: true,
    Dienststelle_DEZPV: true
  };

  function matchVariantHostId(_value) {
    var key = _value != null ? String(_value).trim() : "";
    if (VARIANT_HOST_IDS[key]) {
      return key;
    }
    if (key.indexOf("Dienststelle_BW") !== -1) {
      return "Dienststelle_BW";
    }
    if (key.indexOf("Dienststelle_DEZPV") !== -1) {
      return "Dienststelle_DEZPV";
    }
    return null;
  }

  function readActiveFilterEl(_runtime) {
    return _runtime && _runtime.domRefs ? _runtime.domRefs.activeFilterEl : null;
  }

  function readLabelFromDom(_runtime, _selectors) {
    var activeFilterEl = readActiveFilterEl(_runtime);
    if (!activeFilterEl) {
      return "";
    }
    return _readFilterLabel.readFilterLabel(activeFilterEl, _selectors);
  }

  function resolveDienststelleHostDataId(_lastClickedFilter, _labelFromDom) {
    var candidates;
    var idx;
    var matched;
    matched = matchVariantHostId(_labelFromDom);
    if (matched) {
      return matched;
    }
    if (!_lastClickedFilter) {
      return null;
    }
    candidates = [
      _lastClickedFilter.filterLabel,
      _lastClickedFilter.filterKey,
      _lastClickedFilter.filterId
    ];
    for (idx = 0; idx < candidates.length; idx += 1) {
      matched = matchVariantHostId(candidates[idx]);
      if (matched) {
        return matched;
      }
    }
    console.warn(
      "[filterDock.resolveHostDataId] missing activeFilterKey for dienststelle; tried activeFilterEl data-id, filterLabel, filterKey, filterId"
    );
    return null;
  }

  function __controller(_lastClickedFilter, _selectors, _runtime) {
    var labelFromDom = readLabelFromDom(_runtime, _selectors);
    var filterType = _lastClickedFilter && _lastClickedFilter.filterType;
    if (filterType === "dienststelle") {
      return resolveDienststelleHostDataId(_lastClickedFilter, labelFromDom);
    }
    if (labelFromDom) {
      return labelFromDom;
    }
    if (_lastClickedFilter && _lastClickedFilter.filterLabel) {
      return String(_lastClickedFilter.filterLabel).trim();
    }
    return null;
  }

  return __controller;
});
