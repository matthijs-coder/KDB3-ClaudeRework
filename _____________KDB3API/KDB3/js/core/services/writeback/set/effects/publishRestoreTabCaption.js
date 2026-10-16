define([
  "../../../../../dashboard/tabs/state/selectors.js"
], function (_selectors) {
  "use strict";

  function publishRestoreTabCaption(_KDB, _run, _request) {
    try {
      const loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      let caption;
      let formatted;
      let updated;
      if (!_run || _run.loadingStarted !== true || _run.loadingHandle == null) { return; }
      if (!loading || typeof loading.updateLoadingMessage !== "function") { return; }
      caption = resolveCaption(_KDB, _request);
      if (!caption || caption.skip === true) { return; }
      formatted = caption.message;
      updated = loading.updateLoadingMessage({
        handle: _run.loadingHandle,
        message: formatted
      });
      if (updated === false) {
        console.warn("[writebackSet.publishRestoreTabCaption] updateLoadingMessage returned false");
      }
    } catch (error) {
      console.warn("[writebackSet.publishRestoreTabCaption] failed", error);
    }
  }

  function formatRestoreTabCaption(_KDB, _messageKey, _params) {
    try {
      const template = _KDB.config.labels.de.loading[_messageKey];
      const params = _params || {};
      let message;
      if (typeof template !== "string") { throw new Error("missing label"); }
      message = replaceTokenOnce(template, "{n}", params.n);
      message = replaceTokenOnce(message, "{m}", params.m);
      message = replaceTokenOnce(message, "{name}", params.name);
      return message;
    } catch (error) {
      console.error("[writebackSet.formatRestoreTabCaption] failed", error);
      return "";
    }
  }

  function replaceTokenOnce(message, token, value) {
    const at = typeof message === "string" ? message.indexOf(token) : -1;
    if (value == null || at < 0) { return message; }
    return message.slice(0, at) + String(value) + message.slice(at + token.length);
  }

  function resolveCaption(_KDB, _request) {
    let visibleTabs;
    let slot;
    let message;
    if (_request && _request.landing === true) {
      visibleTabs = _selectors.readVisibleTabs(_KDB) || [];
      if (visibleTabs.length === 0) { return { message: "" }; }
      message = messageForSlot(_KDB, visibleTabs[0], visibleTabs);
      return message == null ? { skip: true } : { message: message };
    }
    if (!_request || typeof _request.tabIdx !== "number") { return { skip: true }; }
    slot = readDashboardSlot(_KDB, _request.tabIdx);
    if (!slot) { return { skip: true }; }
    visibleTabs = _selectors.readVisibleTabs(_KDB) || [];
    message = messageForSlot(_KDB, slot, visibleTabs);
    return message == null ? { skip: true } : { message: message };
  }

  function readDashboardSlot(_KDB, _tabIdx) {
    const state = _selectors.readTabsState(_KDB) || {};
    const order = Array.isArray(state.order) ? state.order : [];
    const byIndex = state.byIndex || {};
    const slots = [];
    let orderIndex;
    let tab;
    for (orderIndex = 0; orderIndex < order.length; orderIndex += 1) {
      tab = byIndex[String(order[orderIndex])];
      if (!tab) { continue; }
      if (!tab.role) {
        console.warn("[writebackSet.publishRestoreTabCaption] tab role missing");
        return null;
      }
      if (tab.role === "dashboard") { slots.push(tab); }
    }
    tab = slots[_tabIdx];
    if (!tab) {
      console.warn("[writebackSet.publishRestoreTabCaption] tab index missed", { tabIdx: _tabIdx });
      return null;
    }
    return tab;
  }

  function messageForSlot(_KDB, slot, visibleTabs) {
    const physicalIndex = slot && typeof slot.index === "number" ? slot.index : null;
    const name = slot && typeof slot.name === "string" ? slot.name : "";
    const hasName = name.length > 0;
    const position = visiblePosition(visibleTabs, physicalIndex);
    if (position >= 0 && hasName) {
      return formatRestoreTabCaption(_KDB, "tabProgressNamedCounted", { n: position + 1, m: visibleTabs.length, name: name });
    }
    if (position >= 0) {
      return formatRestoreTabCaption(_KDB, "tabProgressCounted", { n: position + 1, m: visibleTabs.length });
    }
    if (hasName) { return formatRestoreTabCaption(_KDB, "tabProgressName", { name: name }); }
    return "";
  }

  function visiblePosition(visibleTabs, physicalIndex) {
    let index;
    if (physicalIndex == null || !visibleTabs) { return -1; }
    for (index = 0; index < visibleTabs.length; index += 1) {
      if (visibleTabs[index] && visibleTabs[index].index === physicalIndex) { return index; }
    }
    return -1;
  }

  return publishRestoreTabCaption;
});
