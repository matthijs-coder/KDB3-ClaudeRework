define([
  "../config/defaults.js",
  "../chrome.js",
  "../slots.js",
  "./renderTabEditIcons.js",
  "./commitTabRenameEditSession.js",
  "./bindTabRenameSessionListeners.js"
], function (_defaults, _chrome, _slots, _renderTabEditIcons, _commitTabRenameEditSession, _bindTabRenameSessionListeners) {
  "use strict";

  function startTabRenameEditSession(_ctx) {
    try {
      const state = _ctx.getRawState();
      const target = resolveRenameTarget(state);
      _commitTabRenameEditSession(_ctx, { preserveIncomingEditTarget: true });
      if (!target) { return false; }
      const wrapperEl = _chrome.resolveTabWrapper(_ctx._KDB, target.index);
      const labelEl = wrapperEl && _chrome.resolveLabelNode(wrapperEl);
      if (!wrapperEl || !labelEl) { return false; }
      const originalName = String(labelEl.textContent || target.name || "").trim();
      const runtime = _ctx._KDB.runtime.tabs;
      const session = { tabIndex: target.index, tabId: target.tabId, labelEl: labelEl, wrapperEl: wrapperEl, originalName: originalName, listeners: {}, iconRefs: {}, committing: false, cancelled: false };
      runtime.editSession = session;
      labelEl.setAttribute("contenteditable", "true");
      labelEl.classList.add(_defaults.EDITING_LABEL_CLASS);
      labelEl.focus();
      placeCaretAtEnd(labelEl);
      session.iconRefs = _renderTabEditIcons.renderTabEditIcons(wrapperEl, {
        _KDB: _ctx._KDB,
        tabIndex: session.tabIndex,
        tabId: session.tabId,
        tabName: session.originalName
      });
      // Runtime-mediated commit hook: the edit-icon click handlers end the
      // session via runtime.editSession.commit() before their dialog opens
      // (avoids a module cycle renderTabEditIcons -> tabEditIconActions -> here).
      session.commit = function () { _commitTabRenameEditSession.commitEditSession(_ctx, session); };
      _bindTabRenameSessionListeners(_ctx, session);
      return true;
    } catch (err) {
      console.error("[tabs.startTabRenameEditSession] start failed", err);
      throw err;
    }
  }

  function resolveRenameTarget(state) {
    const byIndex = state && state.byIndex ? state.byIndex : {};
    const editUi = state && state.editUi ? state.editUi : {};
    if (typeof editUi.sessionTabIndex === "number") {
      const sessionTab = byIndex[String(editUi.sessionTabIndex)];
      if (_slots.isRenamableUserTab(sessionTab)) { return sessionTab; }
    }
    const tab = byIndex[String(state && state.activeIndex)];
    return _slots.isRenamableUserTab(tab) ? tab : null;
  }

  function placeCaretAtEnd(node) {
    if (!node || typeof document === "undefined") { return; }
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const selection = window.getSelection && window.getSelection();
    if (!selection) { return; }
    selection.removeAllRanges();
    selection.addRange(range);
  }

  return startTabRenameEditSession;
});
