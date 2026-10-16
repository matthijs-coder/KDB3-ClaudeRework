define(["../config.js", "./filterDom.js"], function (_config, _filterDom) {
  "use strict";

  var SCOPE_BUCKETS = ["global", "pageContext"];

  function readDockName(_activeFilterKey) {
    var key = _activeFilterKey != null ? String(_activeFilterKey) : "";
    var keys = Object.keys(_config.DEFINITIONS);
    var idx;
    var definition;
    if (!key) {
      return null;
    }
    for (idx = 0; idx < keys.length; idx += 1) {
      definition = _config.DEFINITIONS[keys[idx]];
      if (definition && definition.activeFilterKey === key) {
        return definition.visibleFilterLabel;
      }
    }
    return null;
  }

  function hasTechnicalHost(_wrapperEl) {
    var attr = _config.DOM_SELECTORS.filterDataIdAttr;
    if (!_wrapperEl || !_wrapperEl.querySelector) {
      return false;
    }
    return _config.FILTER_KEYS.some(function (hostKey) {
      return !!_wrapperEl.querySelector("[" + attr + '="' + CSS.escape(String(hostKey)) + '"]');
    });
  }

  function applyDockNameDisplay(_wrapperEl, _targetLabel) {
    var selector = _config.DOM_SELECTORS.filterDockFilterNameSelector;
    var labelEl;
    var nextLabel;
    var changed = false;
    if (!_wrapperEl || !_targetLabel || !hasTechnicalHost(_wrapperEl)) {
      return false;
    }
    labelEl = selector && _wrapperEl.querySelector ? _wrapperEl.querySelector(selector) : null;
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

  function syncOneWrapper(_definition, _filterScope) {
    var targetLabel;
    var wrapper;
    if (!_definition || !_definition.activeFilterKey) {
      return false;
    }
    targetLabel = readDockName(_definition.activeFilterKey);
    if (!targetLabel) {
      return false;
    }
    wrapper = _filterDom.findScopedFilterWrapper(_definition.activeFilterKey, _filterScope);
    if (!wrapper) {
      return false;
    }
    return applyDockNameDisplay(wrapper, targetLabel) === true;
  }

  // DOM callback boundary: reports a DOM failure as a result instead of throwing.
  function syncFilterDockNames() {
    var keys = Object.keys(_config.DEFINITIONS);
    var wrappersUpdated = 0;
    var defIdx;
    var scopeIdx;
    try {
      if (typeof document === "undefined") {
        return { didSync: false, wrappersUpdated: 0, reason: "documentUnavailable" };
      }
      for (defIdx = 0; defIdx < keys.length; defIdx += 1) {
        for (scopeIdx = 0; scopeIdx < SCOPE_BUCKETS.length; scopeIdx += 1) {
          if (syncOneWrapper(_config.DEFINITIONS[keys[defIdx]], SCOPE_BUCKETS[scopeIdx])) {
            wrappersUpdated += 1;
          }
        }
      }
      return { didSync: wrappersUpdated > 0, wrappersUpdated: wrappersUpdated };
    } catch (error) {
      console.error("[dienststelle.syncFilterDockNames] failed", error);
      return {
        didSync: false,
        wrappersUpdated: wrappersUpdated,
        reason: "domError",
        errorMessage: String(error && error.message ? error.message : error)
      };
    }
  }

  return {
    syncFilterDockNames: syncFilterDockNames
  };
});
