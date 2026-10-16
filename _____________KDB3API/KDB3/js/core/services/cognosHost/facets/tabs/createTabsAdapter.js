define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js"
], function (_outcome, _errorCodes, _hostAccess) {
  "use strict";

  var CODES = _errorCodes.tabs;

  function readScalarId(_hostObject) {
    if (!_hostObject || _hostObject.id == null || _hostObject.id === "") {
      return null;
    }
    return String(_hostObject.id);
  }

  function hasLayoutContent(_layoutItem) {
    var items = _layoutItem && _layoutItem.items;
    return !!(items && typeof items.length === "number" && items.length > 0);
  }

  // Maps one getTabsContainers layout item to a TabDescriptor. Only scalars leave this function:
  // never items[], never host objects, never DOM nodes.
  function flattenTabDescriptor(_layoutItem, _index) {
    var id = readScalarId(_layoutItem);
    var items = _layoutItem && _layoutItem.items;
    if (!id) {
      return null;
    }
    return {
      id: id,
      tabId: id,
      pageId: readScalarId(items && items[0]) || id,
      index: _index,
      scopeId: id,
      hasContent: hasLayoutContent(_layoutItem)
    };
  }

  // Tab ref: a string id, or an object carrying tabId / pageId / id (first non-empty wins).
  function resolveTabRefId(_tabRef) {
    var keys = ["tabId", "pageId", "id"];
    var index;
    if (typeof _tabRef === "string") {
      return _tabRef !== "" ? _tabRef : null;
    }
    if (_tabRef == null || typeof _tabRef !== "object") {
      return null;
    }
    for (index = 0; index < keys.length; index += 1) {
      if (_tabRef[keys[index]] != null && _tabRef[keys[index]] !== "") {
        return String(_tabRef[keys[index]]);
      }
    }
    return null;
  }

  // Host name -> string; null when the host answered with a promise (getTabName is synchronous).
  function flattenTabName(_value) {
    var keys = ["text", "value", "label", "title"];
    var index;
    if (typeof _value === "string") {
      return _value;
    }
    if (_value == null) {
      return "";
    }
    if (typeof _value === "number" || typeof _value === "boolean") {
      return String(_value);
    }
    if (typeof _value === "object" && typeof _value.then === "function") {
      return null;
    }
    if (typeof _value === "object") {
      for (index = 0; index < keys.length; index += 1) {
        if (typeof _value[keys[index]] === "string") {
          return _value[keys[index]];
        }
      }
    }
    return "";
  }

  function failed(_code, _label, _info, _error) {
    console.error("[cognosHost.tabs." + _label + "] failed", _info, _error);
    return _outcome.buildFailed(_code, [
      _outcome.buildDiagnostic(_code, _error && _error.message ? _error.message : String(_error))
    ]);
  }

  function listNow(_ctx) {
    var resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "tabs", "getTabsContainers", CODES);
    var hostItems;
    var items;
    var descriptors = [];
    var index;
    var descriptor;
    if (resolved.failure) {
      return resolved.failure;
    }
    hostItems = resolved.api.getTabsContainers();
    items = hostItems == null ? [] : Array.isArray(hostItems) ? hostItems : null;
    if (!items) {
      return _outcome.buildFailed(CODES.INVENTORY_FAILED, []);
    }
    for (index = 0; index < items.length; index += 1) {
      descriptor = flattenTabDescriptor(items[index], index);
      if (descriptor) {
        descriptors.push(descriptor);
      }
    }
    return _outcome.buildOk(descriptors);
  }

  function listTabs(_ctx, _input) {
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (_hostAccess.isAborted(_input)) {
      return _outcome.buildAborted("aborted");
    }
    try {
      return listNow(_ctx);
    } catch (error) {
      return failed(CODES.INVENTORY_FAILED, "listTabs", {}, error);
    }
  }

  function getTabName(_ctx, _tabRef) {
    var tabId;
    var resolved;
    var name;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    tabId = resolveTabRefId(_tabRef);
    if (!tabId) {
      return _outcome.buildFailed(CODES.INVALID_ID, []);
    }
    resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "tabs", "getTabName", CODES);
    if (resolved.failure) {
      return resolved.failure;
    }
    try {
      name = flattenTabName(resolved.api.getTabName(tabId));
      if (name == null) {
        return _outcome.buildFailed(CODES.READ_FAILED, [_outcome.buildDiagnostic(CODES.READ_FAILED, "host promise")]);
      }
      return _outcome.buildOk(name);
    } catch (error) {
      return failed(CODES.READ_FAILED, "getTabName", { tabId: tabId }, error);
    }
  }

  async function setTabName(_ctx, _tabRef, _name, _options) {
    var tabId;
    var resolved;
    var confirmed;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (_hostAccess.isAborted(_options)) {
      return _outcome.buildAborted("aborted");
    }
    tabId = resolveTabRefId(_tabRef);
    if (!tabId || typeof _name !== "string" || _name === "") {
      return _outcome.buildFailed(CODES.INVALID_ID, []);
    }
    resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "tabs", "setTabName", CODES);
    if (resolved.failure) {
      return resolved.failure;
    }
    try {
      confirmed = flattenTabName(await Promise.resolve(resolved.api.setTabName(tabId, _name)));
      if (_ctx.isDisposed() || _hostAccess.isAborted(_options)) {
        return _outcome.buildAborted("aborted-after-effect");
      }
      return _outcome.buildOk(confirmed);
    } catch (error) {
      if (_ctx.isDisposed()) {
        return _outcome.buildDisposed();
      }
      if (_hostAccess.isAborted(_options) || (error && error.name === "AbortError")) {
        return _outcome.buildAborted("aborted");
      }
      return failed(CODES.WRITE_FAILED, "setTabName", { tabId: tabId }, error);
    }
  }

  // The tabs facet of the cognosHost service. listTabs returns Outcome<TabDescriptor[]>; tab chrome
  // clicks stay chrome and raw spec arrays never cross the facet boundary.
  function createTabsAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return {
      listTabs: listTabs.bind(null, ctx),
      getTabName: getTabName.bind(null, ctx),
      setTabName: setTabName.bind(null, ctx)
    };
  }

  return createTabsAdapter;
});
