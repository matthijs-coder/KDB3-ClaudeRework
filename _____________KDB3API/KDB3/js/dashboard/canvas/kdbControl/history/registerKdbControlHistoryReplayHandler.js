define(["./createKdbControlHistoryReplayHandler"], function (_createHandler) {
  "use strict";
  /**
   * Stores the kdbControl_settingsChange handler on runtime for approved bootstrap DI.
   * historyService resolves handlers only from create-time replayHandlers unless bootstrap
   * merges runtime.kdbControl.historyReplayHandlerContribution into that map.
   */
  function registerKdbControlHistoryReplayHandler(_KDB, _applySettingsAction) {
    var rt = _KDB.runtime && _KDB.runtime.kdbControl;
    if (!rt) {
      return null;
    }
    var handler = _createHandler(_KDB, _applySettingsAction);
    rt.historyReplayHandlerContribution = handler;
    return handler;
  }
  return registerKdbControlHistoryReplayHandler;
});
