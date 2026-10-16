define(["../config/defaults.js", "./renderTabEditIcons.js"], function (_defaults, _renderTabEditIcons) {
  "use strict";

  function cleanupTabRenameEditSession(_KDB) {
    try {
      const runtime = _KDB && _KDB.runtime && _KDB.runtime.tabs;
      const session = runtime && runtime.editSession;
      if (!session) { return; }
      unbindSessionListeners(session);
      if (session.labelEl) {
        session.labelEl.removeAttribute("contenteditable");
        session.labelEl.classList.remove(_defaults.EDITING_LABEL_CLASS);
      }
      _renderTabEditIcons.removeTabEditIcons(session.iconRefs);
      runtime.editSession = null;
    } catch (err) {
      console.error("[tabs.cleanupTabRenameEditSession] cleanup failed", err);
      throw err;
    }
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
    if (session.focusOutTimer) { clearTimeout(session.focusOutTimer); session.focusOutTimer = null; }
  }

  cleanupTabRenameEditSession.unbindSessionListeners = unbindSessionListeners;
  cleanupTabRenameEditSession.clearFocusOutTimer = clearFocusOutTimer;
  return cleanupTabRenameEditSession;
});
