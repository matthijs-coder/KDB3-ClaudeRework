define(["../config/actionTypes.js", "../config/defaults.js", "./renderTabEditIcons.js", "./cleanupTabRenameEditSession.js"], function (_actionTypes, _defaults, _renderTabEditIcons, _cleanupTabRenameEditSession) {
  "use strict";

  function commitOutgoingEditSession(_ctx, _options) {
    try {
      const runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
      const session = runtime && runtime.editSession;
      if (!session || session.committing || session.cancelled) { return; }
      commitEditSession(_ctx, session, _options);
      if (runtime.editSession) { _cleanupTabRenameEditSession(_ctx._KDB); }
    } catch (err) {
      console.error("[tabs.commitOutgoingEditSession] commit failed", err);
      throw err;
    }
  }

  function commitEditSession(_ctx, session, _options) {
    if (session.committing || session.cancelled) { return; }
    session.committing = true;
    const preserveIncomingEditTarget = !!(_options && _options.preserveIncomingEditTarget);
    const labelEl = session.labelEl;
    const nextName = String(labelEl && labelEl.textContent || "").trim();
    const originalName = session.originalName || "";
    if (!nextName) {
      restoreOriginalLabel(session);
      finishCancel(_ctx, session, preserveIncomingEditTarget);
      return;
    }
    if (nextName === originalName) {
      finishCancel(_ctx, session, preserveIncomingEditTarget);
      return;
    }
    _cleanupTabRenameEditSession.unbindSessionListeners(session);
    if (labelEl) {
      labelEl.removeAttribute("contenteditable");
      labelEl.classList.remove(_defaults.EDITING_LABEL_CLASS);
    }
    _renderTabEditIcons.removeTabEditIcons(session.iconRefs);
    session.iconRefs = {};
    _ctx._KDB.runtime.tabs.editSession = null;
    _ctx.dispatch({ type: _actionTypes.RENAME, payload: { source: "tabEditUi", tabIndex: session.tabIndex, tabId: session.tabId, name: nextName, preserveEditSession: preserveIncomingEditTarget } });
  }

  function cancelEditSession(_ctx, session) {
    if (session.committing || session.cancelled) { return; }
    session.cancelled = true;
    restoreOriginalLabel(session);
    finishCancel(_ctx, session, false);
  }

  function finishCancel(_ctx, session, suppressCancelDispatch) {
    _cleanupTabRenameEditSession(_ctx._KDB);
    if (!suppressCancelDispatch) {
      _ctx.dispatch({ type: _actionTypes.CANCEL_EDIT_SESSION, payload: { source: "tabEditUi", tabIndex: session.tabIndex, tabId: session.tabId } });
    }
  }

  function restoreOriginalLabel(session) {
    if (session.labelEl && session.originalName != null) { session.labelEl.textContent = session.originalName; }
  }

  commitOutgoingEditSession.commitEditSession = commitEditSession;
  commitOutgoingEditSession.cancelEditSession = cancelEditSession;
  return commitOutgoingEditSession;
});
