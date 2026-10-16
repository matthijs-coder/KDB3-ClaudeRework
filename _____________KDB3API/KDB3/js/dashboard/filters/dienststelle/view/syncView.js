define([
  "../config.js",
  "../selectors.js",
  "../effects/hostScope/filterRef.js",
  "./filterDom.js",
  "./labels.js"
], function (_config, _selectors, _filterRef, _filterDom, _labels) {
  "use strict";

  var SCOPE_BUCKETS = ["global", "pageContext"];

  function readActiveSichtValue(_KDB) {
    var context = _selectors.readActiveDienststelleContext(_KDB);
    return context && context.activeSichtValue ? String(context.activeSichtValue) : null;
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
    return _filterDom.findScopedPopupMount(_definition.activeFilterKey, readHandoffFilterScope(_handoff));
  }

  function readPageScopeHostDisplay(_KDB) {
    var byScope = (_selectors.readDienststelleSnapshot(_KDB) || {}).valuesByScope;
    var picked;
    var key;
    if (!byScope) {
      return "";
    }
    picked = _filterRef.pickPageContextScopeMap(_KDB, byScope.pageContext, "active");
    key = picked && Object.keys(picked)[0];
    return (key && picked[key] && picked[key][0] && picked[key][0].hostDisplay) || "";
  }

  function hostDisplayForOverlay(_KDB, _filterScope) {
    var hostDisplay = _filterScope === "global" ? "" : readPageScopeHostDisplay(_KDB);
    return hostDisplay && hostDisplay.indexOf("#") !== -1 ? hostDisplay : "";
  }

  function sanitizeCommittedForScope(_KDB, _definition, _filterScope) {
    var wrapper = _filterDom.findScopedFilterWrapper(_definition.activeFilterKey, _filterScope);
    var hostDisplay = hostDisplayForOverlay(_KDB, _filterScope);
    var overlayWrapper = hostDisplay && _filterScope !== "global"
      ? _filterDom.resolveUniqueOtherDockFilterWrapper(_KDB, _definition.activeFilterKey)
      : null;
    var changed = false;
    if (overlayWrapper) {
      changed = _labels.sanitizeCommittedDisplay(overlayWrapper, hostDisplay);
    }
    if (wrapper && wrapper !== overlayWrapper) {
      changed = _labels.sanitizeCommittedDisplay(wrapper, "") || changed;
    }
    return changed;
  }

  function runCommittedSyncBothBuckets(_KDB, _definition) {
    var committedChanged = false;
    SCOPE_BUCKETS.forEach(function (scope) {
      if (sanitizeCommittedForScope(_KDB, _definition, scope)) {
        committedChanged = true;
      }
    });
    if (!committedChanged) {
      return { didSync: false, reason: "noDisplayNodesUpdated" };
    }
    return { didSync: true, committedChanged: true };
  }

  function runDisplaySync(_KDB, _handoff, _definition) {
    var committedChanged = sanitizeCommittedForScope(_KDB, _definition, readHandoffFilterScope(_handoff));
    var popupMount = resolvePopupMountForSync(_handoff, _definition);
    var popupChanged = 0;
    if (!committedChanged && !popupMount) {
      return { didSync: false, reason: "wrapperUnavailable" };
    }
    if (popupMount) {
      popupChanged = _labels.sanitizePopupLabelsInRoot(popupMount);
    }
    if (!committedChanged && !popupChanged) {
      return { didSync: false, reason: "noDisplayNodesUpdated" };
    }
    return { didSync: true, committedChanged: committedChanged, popupLabelsChanged: popupChanged };
  }

  // DOM callback boundary: reports a DOM failure as a result instead of throwing.
  function syncViewFromState(_KDB, _handoff) {
    var definition = _config.resolveDefinition(readActiveSichtValue(_KDB));
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
      console.error("[dienststelle.syncViewFromState] DOM sync failed", error);
      return {
        didSync: false,
        reason: "domError",
        errorMessage: String(error && error.message ? error.message : error)
      };
    }
  }

  return {
    syncViewFromState: syncViewFromState
  };
});
