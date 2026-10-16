define(["../config.js"], function (_config) {
  "use strict";

  function resolveBucketSelector(_scopeType) {
    if (_scopeType === "global") {
      return _config.domSelectors.globalDockBucketSelector;
    }
    return _config.domSelectors.pageContextDockBucketSelector;
  }

  function findScopedWrapper(_filterLabel, _scopeType) {
    var dockRoot;
    var bucket;
    var hostEl;
    var wrapper;
    if (!_filterLabel || typeof document === "undefined") {
      return null;
    }
    dockRoot = document.querySelector(_config.domSelectors.filterDockRootSelector);
    if (!dockRoot) {
      return null;
    }
    bucket = dockRoot.querySelector(resolveBucketSelector(_scopeType));
    if (!bucket) {
      return null;
    }
    hostEl = bucket.querySelector(
      "[" + _config.domSelectors.filterDataIdAttr + '="' + _filterLabel + '"]'
    );
    if (!hostEl) {
      return null;
    }
    wrapper = hostEl.closest("." + _config.domSelectors.filterItemWrapperClass);
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
    chipEl = _wrapperEl.querySelector(_config.domSelectors.committedDisplaySelector);
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

  function __controller(_instance) {
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
      wrapper = findScopedWrapper(_instance.filterLabel, _instance.scopeType);
      if (!wrapper) {
        return false;
      }
      return paintChip(wrapper, caption);
    } catch (error) {
      console.warn("[singleSelect.applySingleSelectCommittedDisplay] failed", error);
      return false;
    }
  }

  return __controller;
});
