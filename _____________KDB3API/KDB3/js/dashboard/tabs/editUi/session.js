define([
  "../config/actionTypes.js",
  "../config/defaults.js",
  "../chrome.js",
  "../slots.js",
  "./icons.js"
], function (_actionTypes, _defaults, _chrome, _slots, _icons) {
  "use strict";

  // The rename edit session on one tab label: start, commit, cancel and cleanup. The session object lives in
  // runtime.tabs.editSession; the edit icons end it through session.commit() before their dialog opens.

  function startEditSession(_ctx) {
    const target = resolveRenameTarget(_ctx.getRawState());
    commitOutgoingEditSession(_ctx, { preserveIncomingEditTarget: true });
    if (!target) { return false; }
    const wrapperEl = _chrome.resolveTabWrapper(_ctx._KDB, target.index);
    const labelEl = wrapperEl && _chrome.resolveLabelNode(wrapperEl);
    if (!wrapperEl || !labelEl) { return false; }
    const session = {
      tabIndex: target.index,
      tabId: target.tabId,
      labelEl: labelEl,
      wrapperEl: wrapperEl,
      originalName: String(labelEl.textContent || target.name || "").trim(),
      listeners: {},
      iconRefs: {},
      committing: false,
      cancelled: false
    };
    _ctx._KDB.runtime.tabs.editSession = session;
    labelEl.setAttribute("contenteditable", "true");
    labelEl.classList.add(_defaults.EDITING_LABEL_CLASS);
    labelEl.focus();
    placeCaretAtEnd(labelEl);
    session.iconRefs = _icons.renderTabEditIcons(wrapperEl, { _KDB: _ctx._KDB, tabIndex: session.tabIndex, tabId: session.tabId });
    session.commit = function () { commitEditSession(_ctx, session); };
    bindSessionListeners(_ctx, session);
    return true;
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

  function bindSessionListeners(_ctx, session) {
    const labelEl = session.labelEl;
    session.listeners.focusout = onFocusOut.bind(null, _ctx, session);
    session.listeners.keydown = onKeyDown.bind(null, _ctx, session);
    // focusout bubbles: one listener on the wrapper covers the label and the edit icons, so focus leaving via an
    // icon also ends the session (legacy parity: the icons hide when focus leaves the tab button).
    (session.wrapperEl || labelEl).addEventListener("focusout", session.listeners.focusout);
    labelEl.addEventListener("keydown", session.listeners.keydown);
  }

  function onFocusOut(_ctx, session, ev) {
    if (session.committing || session.cancelled) { return; }
    if (isNodeWithinEditArea(session, ev && ev.relatedTarget)) { return; }
    // Legacy parity (configurationToolboxHelpers.handleFocusOut): defer the commit briefly so an in-flight click
    // on an edit icon can still land; document.activeElement is the authoritative check afterwards.
    clearFocusOutTimer(session);
    session.focusOutTimer = setTimeout(function () {
      session.focusOutTimer = null;
      if (session.committing || session.cancelled) { return; }
      if (isNodeWithinEditArea(session, document.activeElement)) { return; }
      runGuarded("focusout", function () { commitEditSession(_ctx, session); });
    }, _defaults.EDIT_SESSION_FOCUSOUT_DELAY_MS);
  }

  function onKeyDown(_ctx, session, ev) {
    if (!ev) { return; }
    if (ev.key === "Enter") {
      ev.preventDefault();
      runGuarded("keydown", function () { commitEditSession(_ctx, session); });
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      runGuarded("keydown", function () { cancelEditSession(_ctx, session); });
    }
  }

  function runGuarded(label, step) {
    try {
      step();
    } catch (err) {
      console.error("[tabs.editSession." + label + "] handler failed", err);
    }
  }

  function isNodeWithinEditArea(session, node) {
    if (!node || typeof node.nodeType !== "number") { return false; }
    if (session.labelEl && (node === session.labelEl || session.labelEl.contains(node))) { return true; }
    return Object.keys(session.iconRefs || {}).some(function (key) {
      const wrapper = session.iconRefs[key];
      return wrapper && (wrapper === node || (wrapper.contains && wrapper.contains(node)));
    });
  }

  function commitOutgoingEditSession(_ctx, _options) {
    const runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
    const session = runtime && runtime.editSession;
    if (!session || session.committing || session.cancelled) { return; }
    commitEditSession(_ctx, session, _options);
    if (runtime.editSession) { cleanupEditSession(_ctx._KDB); }
  }

  function commitEditSession(_ctx, session, _options) {
    if (session.committing || session.cancelled) { return; }
    session.committing = true;
    const preserveIncomingEditTarget = !!(_options && _options.preserveIncomingEditTarget);
    const labelEl = session.labelEl;
    const nextName = String(labelEl && labelEl.textContent || "").trim();
    if (!nextName) {
      restoreOriginalLabel(session);
      finishCancel(_ctx, session, preserveIncomingEditTarget);
      return;
    }
    if (nextName === (session.originalName || "")) {
      finishCancel(_ctx, session, preserveIncomingEditTarget);
      return;
    }
    unbindSessionListeners(session);
    if (labelEl) {
      labelEl.removeAttribute("contenteditable");
      labelEl.classList.remove(_defaults.EDITING_LABEL_CLASS);
    }
    _icons.removeTabEditIcons(session.iconRefs);
    session.iconRefs = {};
    _ctx._KDB.runtime.tabs.editSession = null;
    _ctx.dispatch({
      type: _actionTypes.RENAME,
      payload: {
        source: "tabEditUi",
        tabIndex: session.tabIndex,
        tabId: session.tabId,
        name: nextName,
        preserveEditSession: preserveIncomingEditTarget
      }
    });
  }

  function cancelEditSession(_ctx, session) {
    if (session.committing || session.cancelled) { return; }
    session.cancelled = true;
    restoreOriginalLabel(session);
    finishCancel(_ctx, session, false);
  }

  function finishCancel(_ctx, session, suppressCancelDispatch) {
    cleanupEditSession(_ctx._KDB);
    if (suppressCancelDispatch) { return; }
    _ctx.dispatch({ type: _actionTypes.CANCEL_EDIT_SESSION, payload: { source: "tabEditUi", tabIndex: session.tabIndex, tabId: session.tabId } });
  }

  function restoreOriginalLabel(session) {
    if (session.labelEl && session.originalName != null) { session.labelEl.textContent = session.originalName; }
  }

  function cleanupEditSession(_KDB) {
    const runtime = _KDB && _KDB.runtime && _KDB.runtime.tabs;
    const session = runtime && runtime.editSession;
    if (!session) { return; }
    unbindSessionListeners(session);
    if (session.labelEl) {
      session.labelEl.removeAttribute("contenteditable");
      session.labelEl.classList.remove(_defaults.EDITING_LABEL_CLASS);
    }
    _icons.removeTabEditIcons(session.iconRefs);
    runtime.editSession = null;
  }

  function unbindSessionListeners(session) {
    const labelEl = session.labelEl;
    const listeners = session.listeners || {};
    const focusHost = session.wrapperEl || labelEl;
    if (focusHost && listeners.focusout) { focusHost.removeEventListener("focusout", listeners.focusout); }
    if (labelEl && listeners.keydown) { labelEl.removeEventListener("keydown", listeners.keydown); }
    clearFocusOutTimer(session);
    session.listeners = {};
  }

  function clearFocusOutTimer(session) {
    if (session.focusOutTimer) {
      clearTimeout(session.focusOutTimer);
      session.focusOutTimer = null;
    }
  }

  return {
    startEditSession: startEditSession,
    commitOutgoingEditSession: commitOutgoingEditSession,
    cleanupEditSession: cleanupEditSession
  };
});
