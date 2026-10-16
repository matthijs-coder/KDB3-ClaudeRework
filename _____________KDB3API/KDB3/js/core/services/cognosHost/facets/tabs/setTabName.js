define([
  "./resolveTabsHostApi.js",
  "./buildTabsOutcome.js",
  "./config/tabsErrorCodes.js"
], function (_resolveTabsHostApi, _buildTabsOutcome, _tabsErrorCodes) {
  "use strict";

  function isAborted(_options) {
    return !!(_options && _options.signal && _options.signal.aborted === true);
  }

  function resolveTabRefId(_tabRef) {
    if (_tabRef == null) {
      return null;
    }
    if (typeof _tabRef === "string") {
      return _tabRef !== "" ? _tabRef : null;
    }
    if (typeof _tabRef !== "object") {
      return null;
    }
    if (_tabRef.tabId != null && _tabRef.tabId !== "") {
      return String(_tabRef.tabId);
    }
    if (_tabRef.pageId != null && _tabRef.pageId !== "") {
      return String(_tabRef.pageId);
    }
    if (_tabRef.id != null && _tabRef.id !== "") {
      return String(_tabRef.id);
    }
    return null;
  }

  function flattenTabName(_value) {
    if (typeof _value === "string") {
      return _value;
    }
    if (_value == null) {
      return "";
    }
    if (typeof _value === "number" || typeof _value === "boolean") {
      return String(_value);
    }
    if (typeof _value === "object") {
      if (typeof _value.text === "string") {
        return _value.text;
      }
      if (typeof _value.value === "string") {
        return _value.value;
      }
      if (typeof _value.label === "string") {
        return _value.label;
      }
      if (typeof _value.title === "string") {
        return _value.title;
      }
    }
    return "";
  }

  async function __controller(_ctx, _tabRef, _name, _options) {
    var tabsApi;
    var tabId;
    var confirmed;
    if (_ctx.isDisposed()) {
      return _buildTabsOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildTabsOutcome.buildAborted("aborted");
    }
    tabId = resolveTabRefId(_tabRef);
    if (!tabId || typeof _name !== "string" || _name === "") {
      return _buildTabsOutcome.buildFailed(_tabsErrorCodes.INVALID_ID, []);
    }
    try {
      tabsApi = _resolveTabsHostApi(_ctx._KDB);
      if (!tabsApi) {
        return _buildTabsOutcome.buildFailed(_tabsErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof tabsApi.setTabName !== "function") {
        return _buildTabsOutcome.buildFailed(_tabsErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      confirmed = flattenTabName(await Promise.resolve(tabsApi.setTabName(tabId, _name)));
      if (_ctx.isDisposed() || isAborted(_options)) {
        return _buildTabsOutcome.buildAborted("aborted-after-effect");
      }
      return _buildTabsOutcome.buildOk(confirmed);
    } catch (error) {
      if (_ctx.isDisposed()) {
        return _buildTabsOutcome.buildDisposed();
      }
      if (isAborted(_options) || (error && error.name === "AbortError")) {
        return _buildTabsOutcome.buildAborted("aborted");
      }
      console.error("[cognosHost.tabs.setTabName] failed", { tabId: tabId }, error);
      return _buildTabsOutcome.buildFailed(_tabsErrorCodes.WRITE_FAILED, [
        _buildTabsOutcome.buildDiagnostic(
          _tabsErrorCodes.WRITE_FAILED,
          error && error.message ? error.message : String(error)
        )
      ]);
    }
  }

  return __controller;
});
