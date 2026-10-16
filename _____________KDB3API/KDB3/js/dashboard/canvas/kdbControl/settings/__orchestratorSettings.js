define(["./bindSettingsForm"], function (_bindSettingsForm) {
  "use strict";
  function __orchestratorSettings(_KDB, _surface) {
    var rt = _KDB && _KDB.runtime && _KDB.runtime.kdbControl;
    if (!rt || !rt.domRefs || !rt.domRefs.contentEl) return;
    if (!_surface || typeof _surface.dispatch !== "function" || typeof _surface.getState !== "function") return;
    var prev = rt.abortControllers && rt.abortControllers.settingsForm;
    if (prev && typeof prev.abort === "function") prev.abort();
    rt.abortControllers = rt.abortControllers || {};
    var ctrl = new AbortController();
    rt.abortControllers.settingsForm = ctrl;
    _bindSettingsForm(
      {
        _KDB: _KDB,
        dispatch: _surface.dispatch,
        getState: _surface.getState,
        contentEl: rt.domRefs.contentEl,
      },
      ctrl.signal
    );
  }
  return __orchestratorSettings;
});
