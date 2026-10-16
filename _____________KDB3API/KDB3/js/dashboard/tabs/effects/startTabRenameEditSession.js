define(["../config/defaults.js", "../config/selectors.js", "./renderTabEditIcons.js", "./commitTabRenameEditSession.js", "./bindTabRenameSessionListeners.js"], function (_defaults, _selectors, _renderTabEditIcons, _commitTabRenameEditSession, _bindTabRenameSessionListeners) {
  "use strict";

  function startTabRenameEditSession(_ctx) {
    try {
      const state = _ctx.getRawState();
      const target = resolveRenameTarget(state);
      _commitTabRenameEditSession(_ctx, { preserveIncomingEditTarget: true });
      if (!target) { return false; }
      const wrapperEl = resolveTabWrapper(_ctx._KDB, target.index);
      const labelEl = wrapperEl && resolveLabelNode(wrapperEl);
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
      if (isRenamableUserTab(sessionTab)) { return sessionTab; }
    }
    const tab = byIndex[String(state && state.activeIndex)];
    return isRenamableUserTab(tab) ? tab : null;
  }

  function isRenamableUserTab(tab) { return isVisibleUserTab(tab) && !!tab.tabId; }
  function isVisibleUserTab(tab) { return !!tab && tab.visible === true && isDashboardTab(tab); }
  function isDashboardTab(tab) {
    if (!tab) { return false; }
    if (tab.role) { return tab.role === "dashboard"; }
    return tab.isHelper !== true && tab.index < _defaults.MAX_USER_TABS;
  }

  function resolveTabWrapper(_KDB, tabIndex) {
    const runtime = _KDB.runtime && _KDB.runtime.tabs;
    const cached = runtime && runtime.domRefs && runtime.domRefs.buttons;
    if (cached && cached[tabIndex]) { return cached[tabIndex]; }
    if (typeof document === "undefined" || !document.querySelectorAll) { return null; }
    const selector = _selectors.tabWrapperSelector || _selectors.primaryTabButtonSelector;
    const wrappers = document.querySelectorAll(selector);
    let index = 0;
    while (index < wrappers.length) {
      const wrapper = wrappers[index];
      const item = wrapper && wrapper.querySelector ? wrapper.querySelector(_selectors.tabButtonItemSelector) : null;
      const raw = item && item.getAttribute ? item.getAttribute(_selectors.tabIndexAttribute) : null;
      const parsed = raw == null ? NaN : Number(raw);
      if (parsed === tabIndex) { return wrapper; }
      index += 1;
    }
    return null;
  }

  function resolveLabelNode(wrapperEl) {
    if (!wrapperEl || !wrapperEl.querySelector) { return null; }
    const selectors = _selectors.tabLabelSelectors || [];
    let index = 0;
    while (index < selectors.length) {
      const node = wrapperEl.querySelector(selectors[index]);
      if (node) { return node; }
      index += 1;
    }
    return null;
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
