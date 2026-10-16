define([], function () {
  "use strict";

  var VARIANT_HOST_KEYS = {
    Dienststelle_BW: true,
    Dienststelle_DEZPV: true
  };

  function hasTechnicalHost(_wrapperEl, _selectors) {
    var attr = _selectors.filterDataIdAttr;
    var hostKey;
    if (!_wrapperEl || !_wrapperEl.querySelector) {
      return false;
    }
    for (hostKey in VARIANT_HOST_KEYS) {
      if (
        VARIANT_HOST_KEYS[hostKey] &&
        _wrapperEl.querySelector("[" + attr + '="' + hostKey + '"]')
      ) {
        return true;
      }
    }
    return false;
  }

  function readFilterNameEl(_wrapperEl, _selectors) {
    var selector = _selectors.filterDockFilterNameSelector;
    if (!selector || !_wrapperEl || !_wrapperEl.querySelector) {
      return null;
    }
    return _wrapperEl.querySelector(selector);
  }

  function __controller(_wrapperEl, _targetLabel, _selectors) {
    var labelEl;
    var nextLabel;
    var changed = false;
    if (!_wrapperEl || !_targetLabel || !hasTechnicalHost(_wrapperEl, _selectors)) {
      return false;
    }
    labelEl = readFilterNameEl(_wrapperEl, _selectors);
    if (!labelEl) {
      return false;
    }
    nextLabel = String(_targetLabel);
    if (labelEl.textContent !== nextLabel) {
      labelEl.textContent = nextLabel;
      changed = true;
    }
    if (labelEl.title !== nextLabel) {
      labelEl.title = nextLabel;
      changed = true;
    }
    return changed;
  }

  return __controller;
});
