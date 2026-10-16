define(["../selectors.js"], function (_selectors) {
  "use strict";

  // The loading cover and its "Tab n von m: name" caption while a tab mutation or its traversal runs.
  // Cosmetic: a failing cover never breaks the mutation, so the public functions log and carry on.

  const MOUNT_KEY = "tabs-mutation-loading";
  const SESSION_KEYS = {
    duplicate: "tabMutationCopy",
    delete: "tabMutationDelete",
    move: "tabMutationMove",
    restoreDeleted: "tabMutationRestore"
  };

  function startMutationFrame(_ctx, _plan) {
    let started = false;
    try {
      const kdb = _ctx && _ctx._KDB;
      const writeback = kdb && kdb.state && kdb.state.loading && kdb.state.loading["writeback-set-loading"];
      if (writeback && writeback.isActive === true) { return false; }
      const loading = kdb && kdb.services && kdb.services.loading;
      const mountEl = readMutationMountEl(kdb);
      const sessionMessageKey = SESSION_KEYS[_plan && _plan.operation] || "";
      if (!loading || typeof loading.startLoading !== "function" || !mountEl || !sessionMessageKey) { return false; }
      started = true;
      loading.startLoading({ mountEl: mountEl, mountKey: MOUNT_KEY, sessionMessageKey: sessionMessageKey });
      if (typeof loading.updateLoadingMessage === "function") {
        loading.updateLoadingMessage({ mountKey: MOUNT_KEY, message: formatSlotMessage(kdb, readPlanIndex(_plan)) });
      }
      return started;
    } catch (err) {
      console.warn("[tabs.startMutationFrame] failed", err);
      return started;
    }
  }

  function finishMutationFrame(_ctx) {
    try {
      const loading = _ctx && _ctx._KDB && _ctx._KDB.services && _ctx._KDB.services.loading;
      if (loading && typeof loading.finishLoading === "function") { loading.finishLoading({ mountKey: MOUNT_KEY }); }
    } catch (err) {
      console.warn("[tabs.finishMutationFrame] failed", err);
    }
  }

  // Updates the caption to the tab a mutation traversal is visiting.
  function syncTraverseLine(_KDB, _state, _options) {
    if (!_options || _options.source !== "tabsMutation") { return false; }
    try {
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      if (!loading || typeof loading.updateLoadingMessage !== "function") { return false; }
      const message = formatSlotMessage(_KDB, readTraverseIndex(_state, _options));
      return loading.updateLoadingMessage({ mountKey: MOUNT_KEY, message: message }) === true;
    } catch (err) {
      console.warn("[tabs.syncTraverseLine] failed", err);
      return false;
    }
  }

  function readMutationMountEl(_KDB) {
    if (typeof document === "undefined" || !document.querySelector) { return null; }
    const root = _KDB && _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.root;
    return document.querySelector((root && root.dashboardFrame) || ".dashboardFrame");
  }

  function readPlanIndex(_plan) {
    if (!_plan) { return null; }
    let slot = null;
    if (_plan.operation === "move" || _plan.operation === "duplicate") {
      slot = _plan.sourceSlot;
    } else if (_plan.operation === "delete") {
      slot = _plan.deletedSlot;
    } else if (_plan.operation === "restoreDeleted") {
      slot = _plan.insertSlot;
    }
    return slot && typeof slot.index === "number" ? slot.index : null;
  }

  function readTraverseIndex(_state, _options) {
    if (_options && _options.scope === "singleTab") { return _options.tabIndex; }
    return _state ? _state.activeIndex : null;
  }

  function formatSlotMessage(_KDB, physicalIndex) {
    if (typeof physicalIndex !== "number") { return ""; }
    const tab = _selectors.readTabByIndex(_KDB, physicalIndex);
    const name = tab && typeof tab.name === "string" ? tab.name : "";
    const visibleTabs = _selectors.readVisibleTabs(_KDB) || [];
    const position = visibleTabs.findIndex(function (visible) { return visible && visible.index === physicalIndex; });
    if (position >= 0 && name.length > 0) { return applyTokens(_KDB, "tabProgressNamedCounted", position + 1, visibleTabs.length, name); }
    if (position >= 0) { return applyTokens(_KDB, "tabProgressCounted", position + 1, visibleTabs.length, null); }
    return name.length > 0 ? applyTokens(_KDB, "tabProgressName", null, null, name) : "";
  }

  // A missing label gives no caption.
  function applyTokens(_KDB, messageKey, n, m, name) {
    const labels = _KDB && _KDB.config && _KDB.config.labels && _KDB.config.labels.de && _KDB.config.labels.de.loading;
    const template = labels ? labels[messageKey] : null;
    if (typeof template !== "string") { return ""; }
    return replaceTokenOnce(replaceTokenOnce(replaceTokenOnce(template, "{n}", n), "{m}", m), "{name}", name);
  }

  function replaceTokenOnce(message, token, value) {
    const at = message.indexOf(token);
    if (value == null || at < 0) { return message; }
    return message.slice(0, at) + String(value) + message.slice(at + token.length);
  }

  return { startMutationFrame: startMutationFrame, finishMutationFrame: finishMutationFrame, syncTraverseLine: syncTraverseLine };
});
