define(["../config/defaults.js", "./commitTabRenameEditSession.js", "./cleanupTabRenameEditSession.js"], function (_defaults, _commitTabRenameEditSession, _cleanupTabRenameEditSession) {
  "use strict";

  function bindTabRenameSessionListeners(_ctx, session) {
    try {
      const labelEl = session.labelEl;
      session.listeners.focusout = onFocusOut.bind(null, _ctx, session);
      session.listeners.keydown = onKeyDown.bind(null, _ctx, session);
      // focusout bubbles: one listener on the wrapper covers the label AND the
      // edit icons, so focus leaving via an icon also ends the session (legacy
      // parity: the icons hide when focus leaves the tab button).
      (session.wrapperEl || labelEl).addEventListener("focusout", session.listeners.focusout);
      labelEl.addEventListener("keydown", session.listeners.keydown);
    } catch (err) {
      console.error("[tabs.bindTabRenameSessionListeners] bind failed", err);
      throw err;
    }
  }

  function onFocusOut(_ctx, session, ev) {
    try {
      if (session.committing || session.cancelled) { return; }
      if (isNodeWithinEditArea(session, ev && ev.relatedTarget)) { return; }
      // Legacy parity (configurationToolboxHelpers.handleFocusOut): defer the
      // commit/hide briefly so an in-flight click on an edit icon can still
      // land; document.activeElement is the authoritative check afterwards.
      _cleanupTabRenameEditSession.clearFocusOutTimer(session);
      session.focusOutTimer = setTimeout(function () {
        session.focusOutTimer = null;
        if (session.committing || session.cancelled) { return; }
        if (isNodeWithinEditArea(session, document.activeElement)) { return; }
        _commitTabRenameEditSession.commitEditSession(_ctx, session);
      }, _defaults.EDIT_SESSION_FOCUSOUT_DELAY_MS);
    } catch (err) {
      console.error("[tabs.onFocusOut] focusout failed", err);
      throw err;
    }
  }

  function isNodeWithinEditArea(session, node) {
    if (!node || typeof node.nodeType !== "number") { return false; }
    if (session.labelEl && (node === session.labelEl || session.labelEl.contains(node))) { return true; }
    return isWithinIconWrappers(session, node);
  }

  function isWithinIconWrappers(session, node) {
    if (!node) { return false; }
    return Object.keys(session.iconRefs || {}).some(function (key) {
      const wrapper = session.iconRefs[key];
      return wrapper && (wrapper === node || (wrapper.contains && wrapper.contains(node)));
    });
  }

  function onKeyDown(_ctx, session, ev) {
    try {
      if (!ev) { return; }
      if (ev.key === "Enter") { ev.preventDefault(); _commitTabRenameEditSession.commitEditSession(_ctx, session); return; }
      if (ev.key === "Escape") { ev.preventDefault(); _commitTabRenameEditSession.cancelEditSession(_ctx, session); }
    } catch (err) {
      console.error("[tabs.onKeyDown] keydown failed", err);
      throw err;
    }
  }

  return bindTabRenameSessionListeners;
});
