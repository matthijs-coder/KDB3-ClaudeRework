define(["./config.js"], function (_config) {
  "use strict";

  var selectors = _config.domSelectors;

  function resolveBucketSelector(_scopeType) {
    if (_scopeType === "global") {
      return selectors.globalDockBucketSelector;
    }
    return selectors.pageContextDockBucketSelector;
  }

  // Compares the attribute value instead of building a selector, so labels with quotes or backslashes work.
  function findHostByLabel(_bucket, _filterLabel) {
    var attr = selectors.filterDataIdAttr;
    var candidates = _bucket.querySelectorAll("[" + attr + "]");
    var i;
    for (i = 0; i < candidates.length; i += 1) {
      if (candidates[i].getAttribute(attr) === _filterLabel) {
        return candidates[i];
      }
    }
    return null;
  }

  function findScopedWrapper(_dockRoot, _filterLabel, _scopeType) {
    var bucket;
    var hostEl;
    var wrapper;
    if (!_filterLabel || !_dockRoot) {
      return null;
    }
    bucket = _dockRoot.querySelector(resolveBucketSelector(_scopeType));
    if (!bucket) {
      return null;
    }
    hostEl = findHostByLabel(bucket, _filterLabel);
    if (!hostEl) {
      return null;
    }
    wrapper = hostEl.closest("." + selectors.filterItemWrapperClass);
    return wrapper || null;
  }

  function chipTextEquals(_el, _caption) {
    var text = _el && typeof _el.textContent === "string" ? _el.textContent : "";
    var caption = _caption == null ? "" : String(_caption);
    return text.trim() === caption.trim();
  }

  function paintChip(_wrapperEl, _caption) {
    var chipEl;
    if (!_wrapperEl || !_wrapperEl.querySelector) {
      return false;
    }
    chipEl = _wrapperEl.querySelector(selectors.committedDisplaySelector);
    if (!chipEl || chipTextEquals(chipEl, _caption)) {
      return false;
    }
    chipEl.textContent = _caption;
    chipEl.setAttribute("title", _caption);
    if (!(chipEl.getAttribute("aria-label") || "")) {
      chipEl.setAttribute("aria-label", _caption);
    }
    return true;
  }

  function applyCommittedDisplay(_dockRoot, _instance) {
    try {
      var caption;
      var wrapper;
      if (!_instance || !_instance.filterLabel) {
        return false;
      }
      caption = _instance.currentSelection && _instance.currentSelection.displayValue;
      if (typeof caption !== "string") {
        return false;
      }
      wrapper = findScopedWrapper(_dockRoot, _instance.filterLabel, _instance.scopeType);
      if (!wrapper) {
        return false;
      }
      return paintChip(wrapper, caption);
    } catch (error) {
      console.warn("[singleSelect.applyCommittedDisplay] failed", error);
      return false;
    }
  }

  function isEligibleRecord(_record) {
    var selection;
    var displayValue;
    if (!_record || _record.selectionOwner !== "singleSelect") {
      return false;
    }
    if (_record.status !== "active" || _record.hostStatus !== "present") {
      return false;
    }
    if (_record.isCommitInProgress === true) {
      return false;
    }
    selection = _record.currentSelection || {};
    if (selection.displaySource !== "table") {
      return false;
    }
    displayValue = selection.displayValue;
    if (displayValue == null || String(displayValue).trim() === "") {
      return false;
    }
    return true;
  }

  function handleCommittedDisplay(_KDB) {
    try {
      var root;
      var instancesById;
      var eligible;
      var dockRoot;
      root = _KDB && _KDB.state && _KDB.state.filters
        ? _KDB.state.filters.singleSelect
        : null;
      instancesById = root && root.instancesById;
      if (!instancesById) {
        return;
      }
      eligible = Object.keys(instancesById)
        .map(function (_id) { return instancesById[_id]; })
        .filter(isEligibleRecord);
      if (eligible.length === 0 || typeof document === "undefined") {
        return;
      }
      dockRoot = document.querySelector(selectors.filterDockRootSelector);
      if (!dockRoot) {
        return;
      }
      eligible.forEach(function (_record) {
        applyCommittedDisplay(dockRoot, _record);
      });
    } catch (error) {
      console.error("[singleSelect.handleCommittedDisplay] failed", error);
    }
  }

  return {
    handleCommittedDisplay: handleCommittedDisplay,
    applyCommittedDisplay: applyCommittedDisplay
  };
});
