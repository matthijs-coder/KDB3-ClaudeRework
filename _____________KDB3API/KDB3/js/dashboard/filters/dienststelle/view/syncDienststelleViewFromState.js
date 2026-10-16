define([
  "../state/selectors.js",
  "../effects/resolveDienststelleDataKey.js",
  "../config/selectors.js",
  "./resolveScopedDienststelleFilterDom.js",
  "./sanitizeDienststelleVisibleLabel.js",
  "./applyDienststelleDisplaySanitizing.js",
  "../effects/pickPageContextScopeMap.js",
  "./resolveUniqueOtherDockFilterWrapper.js"
], function (
  _selectors,
  _resolveDataKey,
  _viewSelectors,
  _resolveScopedDom,
  _sanitize,
  _createApplyDisplay,
  _pickPageContextScopeMap,
  _resolveUniqueOtherDockFilterWrapper
) {
  "use strict";

  var _applyDisplay = _createApplyDisplay();
  var SCOPE_BUCKETS = ["global", "pageContext"];

  function readActiveSichtValue(_KDB) {
    var ctx = _selectors.readActiveDienststelleContext(_KDB);
    return ctx && ctx.activeSichtValue ? String(ctx.activeSichtValue) : null;
  }

  function readHandoffFilterScope(_handoff) {
    if (!_handoff) {
      return "global";
    }
    if (_handoff.filterScope) {
      return String(_handoff.filterScope);
    }
    if (_handoff.scopeType) {
      return String(_handoff.scopeType);
    }
    return "global";
  }

  function resolvePopupMountForSync(_handoff, _definition) {
    var filterScope = readHandoffFilterScope(_handoff);
    return _resolveScopedDom.findScopedPopupMount(_definition.activeFilterKey, filterScope);
  }

  function readThisScopeHostDisplay(_KDB, _filterScope) {
    var byScope = (_selectors.readDienststelleSnapshot(_KDB) || {}).valuesByScope;
    var picked;
    var key;
    if (!byScope) {
      return "";
    }
    if (_filterScope === "global") {
      return (byScope.global && byScope.global[0] && byScope.global[0].hostDisplay) || "";
    }
    picked = _pickPageContextScopeMap(_KDB, byScope.pageContext, "active");
    key = picked && Object.keys(picked)[0];
    return (key && picked[key] && picked[key][0] && picked[key][0].hostDisplay) || "";
  }

  function hostDisplayForOverlay(_KDB, _filterScope) {
    var hostDisplay = _filterScope === "global" ? "" : readThisScopeHostDisplay(_KDB, "pageContext");
    return hostDisplay && hostDisplay.indexOf("#") !== -1 ? hostDisplay : "";
  }

  function sanitizeCommittedForScope(_KDB, _definition, _filterScope) {
    var wrapper = _resolveScopedDom.findScopedFilterWrapper(_definition.activeFilterKey, _filterScope);
    var hostDisplay = hostDisplayForOverlay(_KDB, _filterScope);
    var overlayWrapper = hostDisplay && _filterScope !== "global"
      ? _resolveUniqueOtherDockFilterWrapper(_KDB, _definition.activeFilterKey)
      : null;
    var changed = false;
    if (overlayWrapper) {
      changed = _applyDisplay.sanitizeCommittedDisplay(overlayWrapper, _sanitize, _viewSelectors, hostDisplay);
    }
    if (wrapper && wrapper !== overlayWrapper) {
      changed = _applyDisplay.sanitizeCommittedDisplay(wrapper, _sanitize, _viewSelectors, "") || changed;
    }
    return changed;
  }

  function runCommittedSyncBothBuckets(_KDB, _definition) {
    var idx;
    var committedChanged = false;
    for (idx = 0; idx < SCOPE_BUCKETS.length; idx += 1) {
      if (sanitizeCommittedForScope(_KDB, _definition, SCOPE_BUCKETS[idx])) {
        committedChanged = true;
      }
    }
    if (!committedChanged) {
      return { didSync: false, reason: "noDisplayNodesUpdated" };
    }
    return { didSync: true, committedChanged: true };
  }

  function runDisplaySync(_KDB, _handoff, _definition) {
    var filterScope = readHandoffFilterScope(_handoff);
    var popupMount;
    var popupChanged = 0;
    var committedChanged = sanitizeCommittedForScope(_KDB, _definition, filterScope);
    if (!committedChanged && !resolvePopupMountForSync(_handoff, _definition)) {
      return { didSync: false, reason: "wrapperUnavailable" };
    }
    popupMount = resolvePopupMountForSync(_handoff, _definition);
    if (popupMount) {
      popupChanged = _applyDisplay.sanitizePopupLabelsInRoot(
        popupMount,
        _sanitize,
        _viewSelectors
      );
    }
    if (!committedChanged && !popupChanged) {
      return { didSync: false, reason: "noDisplayNodesUpdated" };
    }
    return { didSync: true, committedChanged: committedChanged, popupLabelsChanged: popupChanged };
  }

  function __controller(_KDB, _handoff) {
    var activeSichtValue = readActiveSichtValue(_KDB);
    var definition = _resolveDataKey(activeSichtValue);
    try {
      if (!definition) {
        return { didSync: false, reason: "definitionUnavailable" };
      }
      if (definition.shouldSanitizeOptionDisplay !== true) {
        return { didSync: false, reason: "sanitizingDisabled" };
      }
      if (!_handoff) {
        return runCommittedSyncBothBuckets(_KDB, definition);
      }
      return runDisplaySync(_KDB, _handoff, definition);
    } catch (error) {
      console.error("[dienststelle.syncDienststelleViewFromState] DOM sync failed", error);
      return {
        didSync: false,
        reason: "domError",
        errorMessage: String(error && error.message ? error.message : error)
      };
    }
  }

  return __controller;
});
