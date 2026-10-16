define([
  "../config/defaults.js",
  "./confirmAndDispatchTabDelete.js",
  "./confirmAndDispatchTabMove.js",
  "./confirmAndDispatchTabDuplicate.js"
], function (_defaults, _confirmAndDispatchTabDelete, _confirmAndDispatchTabMove, _confirmAndDispatchTabDuplicate) {
  "use strict";

  function isTabMutationInFlight(context) {
    var kdb = context && context._KDB;
    return !!(kdb && kdb.runtime && kdb.runtime.tabs && kdb.runtime.tabs.pendingPromises && kdb.runtime.tabs.pendingPromises.tabMutation);
  }

  function isIconEnabled(cfg, context) {
    if (isTabMutationInFlight(context)) { return false; }
    if (cfg.key === "delete") { return _defaults.TAB_DELETE_UI_ENABLED === true; }
    if (cfg.key === "move") { return _defaults.TAB_MOVE_UI_ENABLED === true; }
    if (cfg.key === "duplicate") { return _defaults.TAB_DUPLICATE_UI_ENABLED === true; }
    return false;
  }

  function bindIconClick(cfg, context, enabled, top, input, tabIndex, tabId, actionName, tabName) {
    if (cfg.key === "delete" && enabled) {
      var deleteHandler = onDeleteIconClick.bind(null, context && context._KDB, tabIndex, tabId);
      top.addEventListener("click", deleteHandler);
      input.addEventListener("click", deleteHandler);
      return;
    }
    if (cfg.key === "move" && enabled) {
      var moveHandler = onMoveIconClick.bind(null, context && context._KDB, tabIndex, tabId);
      top.addEventListener("click", moveHandler);
      input.addEventListener("click", moveHandler);
      return;
    }
    if (cfg.key === "duplicate" && enabled) {
      var duplicateHandler = onDuplicateIconClick.bind(null, context && context._KDB, tabIndex, tabId);
      top.addEventListener("click", duplicateHandler);
      input.addEventListener("click", duplicateHandler);
      return;
    }
    var deferred = onDeferredIconClick.bind(null, actionName, tabName, tabIndex);
    top.addEventListener("click", deferred);
    input.addEventListener("click", deferred);
  }

  // Legacy parity: a clicked edit icon never keeps a persistent "selected"
  // look (the look is pure :focus styling). Dropping focus also lets the
  // session's focusout watchdog remove the icons after its 100ms delay.
  function blurIconTarget(ev) {
    var el = ev && ev.target;
    if (el && typeof el.blur === "function") { el.blur(); }
  }

  // Legacy parity: an icon action ends the rename session up front (a typed
  // name still commits, like the legacy span-focusout did), so the icons are
  // removed and the toolbox radio unchecks before the dialog even opens —
  // also when the user cancels the dialog afterwards.
  function endActiveEditSession(_KDB) {
    try {
      var session = _KDB && _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.editSession;
      if (session && typeof session.commit === "function") { session.commit(); }
    } catch (err) {
      console.warn("[tabs.editIcon] ending edit session failed", err);
    }
  }

  async function onDeleteIconClick(_KDB, tabIndex, tabId, ev) {
    try {
      ev.preventDefault();
      ev.stopPropagation();
      blurIconTarget(ev);
      if (!_KDB) { return false; }
      endActiveEditSession(_KDB);
      await _confirmAndDispatchTabDelete(_KDB, { tabIndex: tabIndex, tabId: tabId });
      return false;
    } catch (err) {
      console.warn("[tabs.editIcon] delete click handling failed", err);
      return false;
    }
  }

  async function onMoveIconClick(_KDB, tabIndex, tabId, ev) {
    try {
      ev.preventDefault();
      ev.stopPropagation();
      blurIconTarget(ev);
      if (!_KDB) { return false; }
      endActiveEditSession(_KDB);
      await _confirmAndDispatchTabMove(_KDB, { tabIndex: tabIndex, tabId: tabId });
      return false;
    } catch (err) {
      console.warn("[tabs.editIcon] move click handling failed", err);
      return false;
    }
  }

  async function onDuplicateIconClick(_KDB, tabIndex, tabId, ev) {
    try {
      ev.preventDefault();
      ev.stopPropagation();
      blurIconTarget(ev);
      if (!_KDB) { return false; }
      endActiveEditSession(_KDB);
      await _confirmAndDispatchTabDuplicate(_KDB, { tabIndex: tabIndex, tabId: tabId });
      return false;
    } catch (err) {
      console.warn("[tabs.editIcon] duplicate click handling failed", err);
      return false;
    }
  }

  function onDeferredIconClick(actionName, tabName, tabIndex, ev) {
    ev.preventDefault();
    ev.stopPropagation();
    blurIconTarget(ev);
    console.log('[tabs.editIcon] ' + actionName + ' clicked for tab "' + tabName + '" (index ' + tabIndex + ')');
    return false;
  }

  return { isIconEnabled: isIconEnabled, bindIconClick: bindIconClick };
});
