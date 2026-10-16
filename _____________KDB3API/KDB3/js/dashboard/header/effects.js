define([
  "./state.js",
  "./view.js",
  "./editSession.js",
  "./events/eventNames.js"
], function (_state, _view, _editSession, _eventNames) {
  "use strict";

  var SILENT_ACTION_TYPES = { "header/startTitleEdit": 1, "header/startSubtitleEdit": 1 };

  var KDB_CONTROL_SYNC_ACTION_TYPES = {
    "header/toggle": 1,
    "header/show": 1,
    "header/hide": 1,
    "header/toggleSubtitle": 1,
    "header/setSubtitleChrome": 1,
    "header/startTitleEdit": 1,
    "header/startSubtitleEdit": 1,
    "header/commitTitle": 1,
    "header/commitSubtitle": 1,
    "header/cancelEdit": 1
  };

  function syncKdbControlReadView(_KDB, _action) {
    if (!_action) return;
    var isReplay = _action.options && _action.options.isHistoryReplay === true;
    if (!isReplay && !KDB_CONTROL_SYNC_ACTION_TYPES[_action.type]) return;
    var kdbControlRuntime = _KDB.runtime && _KDB.runtime.kdbControl;
    var bindContext = kdbControlRuntime && kdbControlRuntime.frameworkBindContext;
    if (bindContext && typeof bindContext.syncView === "function") bindContext.syncView();
  }

  function emitConfirmedChange(_KDB, _action, _prevChrome) {
    var type = _action.type;
    var current = _state.snapshotChrome(_KDB.state.header);
    if (SILENT_ACTION_TYPES[type] || _state.isSameChrome(_prevChrome, current)) return;
    _KDB.events.emit(_eventNames.HEADER_CONFIRMED_CHANGED, {
      status: current.status,
      subtitleStatus: current.subtitleStatus,
      titleText: current.titleText,
      subtitleText: current.subtitleText,
      source: (_action.payload && _action.payload.source) || "bootstrap"
    });
  }

  function runHeaderEffects(_KDB, _prevChrome, _action) {
    // Boundary: a DOM/effects failure is logged so the caller still pushes the history step for the committed state.
    try {
      if (_KDB.state.header.status !== "active") _view.removeHeaderChrome(_KDB);
      else _view.ensureHeaderChrome(_KDB);
      _view.syncHeaderView(_KDB);
      _editSession.bindHeaderEditSession(_KDB, _action);
      syncKdbControlReadView(_KDB, _action);
      if (_action.type === "__mountSync") return;
      emitConfirmedChange(_KDB, _action, _prevChrome);
    } catch (err) {
      console.error("[header.effects]", err);
    }
  }

  return { runHeaderEffects: runHeaderEffects };
});
