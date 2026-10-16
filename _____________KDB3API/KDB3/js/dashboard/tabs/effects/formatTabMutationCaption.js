define(["../state/selectors.js"], function (_selectors) {
  "use strict";

  function messageForPlan(_KDB, _plan) {
    try {
      return formatSlotMessage(_KDB, readPlanIndex(_plan));
    } catch (err) {
      console.warn("[tabs.formatTabMutationCaption] failed", err);
      return "";
    }
  }

  function syncTraverseLine(_KDB, _state, _options) {
    try {
      var loading;
      var message;
      if (!_options || _options.source !== "tabsMutation") { return false; }
      loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      if (!loading || typeof loading.updateLoadingMessage !== "function") { return false; }
      message = formatSlotMessage(_KDB, readTraverseIndex(_state, _options));
      return loading.updateLoadingMessage({ mountKey: "tabs-mutation-loading", message: message }) === true;
    } catch (err) {
      console.warn("[tabs.formatTabMutationCaption] failed", err);
      return false;
    }
  }

  function readPlanIndex(_plan) {
    var slot = null;
    if (!_plan) { return null; }
    if (_plan.operation === "move" || _plan.operation === "duplicate") { slot = _plan.sourceSlot; }
    else if (_plan.operation === "delete") { slot = _plan.deletedSlot; }
    else if (_plan.operation === "restoreDeleted") { slot = _plan.insertSlot; }
    return slot && typeof slot.index === "number" ? slot.index : null;
  }

  function readTraverseIndex(_state, _options) {
    if (_options && _options.scope === "singleTab") { return _options.tabIndex; }
    return _state ? _state.activeIndex : null;
  }

  function formatSlotMessage(_KDB, physicalIndex) {
    try {
      var tab;
      var name;
      var visibleTabs;
      var position;
      var hasName;
      if (typeof physicalIndex !== "number") { return ""; }
      tab = _selectors.readTabByIndex(_KDB, physicalIndex);
      name = tab && typeof tab.name === "string" ? tab.name : "";
      hasName = name.length > 0;
      visibleTabs = _selectors.readVisibleTabs(_KDB) || [];
      position = findVisiblePosition(visibleTabs, physicalIndex);
      if (position >= 0 && hasName) {
        return applyTokens(_KDB, "tabProgressNamedCounted", position + 1, visibleTabs.length, name);
      }
      if (position >= 0) {
        return applyTokens(_KDB, "tabProgressCounted", position + 1, visibleTabs.length, null);
      }
      if (hasName) { return applyTokens(_KDB, "tabProgressName", null, null, name); }
      return "";
    } catch (err) {
      console.warn("[tabs.formatTabMutationCaption] failed", err);
      return "";
    }
  }

  function findVisiblePosition(visibleTabs, physicalIndex) {
    var index;
    if (!visibleTabs || typeof physicalIndex !== "number") { return -1; }
    for (index = 0; index < visibleTabs.length; index += 1) {
      if (visibleTabs[index] && visibleTabs[index].index === physicalIndex) { return index; }
    }
    return -1;
  }

  function applyTokens(_KDB, messageKey, n, m, name) {
    var labels = _KDB && _KDB.config && _KDB.config.labels && _KDB.config.labels.de && _KDB.config.labels.de.loading;
    var message = labels ? labels[messageKey] : null;
    if (typeof message !== "string") { throw new Error("missing label"); }
    message = replaceTokenOnce(message, "{n}", n);
    message = replaceTokenOnce(message, "{m}", m);
    message = replaceTokenOnce(message, "{name}", name);
    return message;
  }

  function replaceTokenOnce(message, token, value) {
    var at = typeof message === "string" ? message.indexOf(token) : -1;
    if (value == null || at < 0) { return message; }
    return message.slice(0, at) + String(value) + message.slice(at + token.length);
  }

  function startMutationFrame(_ctx, _plan) {
    var started = false;
    try {
      var kdb = _ctx && _ctx._KDB;
      var writeback = kdb && kdb.state && kdb.state.loading && kdb.state.loading["writeback-set-loading"];
      var loading;
      var mountEl;
      var sessionMessageKey;
      var message;
      if (writeback && writeback.isActive === true) { return false; }
      loading = kdb && kdb.services && kdb.services.loading;
      mountEl = readMutationMountEl(kdb);
      sessionMessageKey = sessionKeyForOperation(_plan && _plan.operation);
      if (!loading || typeof loading.startLoading !== "function" || !mountEl || !sessionMessageKey) { return false; }
      started = true;
      loading.startLoading({ mountEl: mountEl, mountKey: "tabs-mutation-loading", sessionMessageKey: sessionMessageKey });
      message = messageForPlan(kdb, _plan);
      if (typeof message === "string" && typeof loading.updateLoadingMessage === "function") { loading.updateLoadingMessage({ mountKey: "tabs-mutation-loading", message: message }); }
      return started;
    } catch (err) {
      console.warn("[tabs.startMutationFrame] failed", err);
      return started;
    }
  }

  function finishMutationFrame(_ctx) {
    try {
      var loading = _ctx && _ctx._KDB && _ctx._KDB.services && _ctx._KDB.services.loading;
      if (loading && typeof loading.finishLoading === "function") { loading.finishLoading({ mountKey: "tabs-mutation-loading" }); }
    } catch (err) {
      console.warn("[tabs.finishMutationFrame] failed", err);
    }
  }

  function readMutationMountEl(_KDB) {
    try {
      var root = _KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root;
      var selector = (root && root.dashboardFrame) || ".dashboardFrame";
      if (typeof document === "undefined" || !document.querySelector) { return null; }
      return document.querySelector(selector);
    } catch (err) {
      console.warn("[tabs.readMutationMountEl] failed", err);
      return null;
    }
  }

  function sessionKeyForOperation(operation) {
    var keys = { duplicate: "tabMutationCopy", delete: "tabMutationDelete", move: "tabMutationMove", restoreDeleted: "tabMutationRestore" };
    return keys[operation] || "";
  }

  return { messageForPlan: messageForPlan, syncTraverseLine: syncTraverseLine, startMutationFrame: startMutationFrame, finishMutationFrame: finishMutationFrame, readMutationMountEl: readMutationMountEl, sessionKeyForOperation: sessionKeyForOperation };
});
