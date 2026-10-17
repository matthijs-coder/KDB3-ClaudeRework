/*
 * Shared controller for the toolbar buttons (history, pdf, share, wienKi).
 * Each button file registers its definition here (index.js registers all four); the bootstrap manifest mounts and
 * destroys every button on its own through _KDB.api.<apiName>. Toolbar waiting, placement and observation are shared
 * (toolbarHost.js).
 */
define([
  "./toolbarHost.js",
  "./toolbarButton.js",
  "../../../core/utils/kit/errors.js"
], function (_host, _button, _errors) {
  "use strict";

  function createToolbarController(_KDB, def) {
    var guard = _errors.createDisposedGuard(def.apiName);
    var inst = _button.createButtonInstance(def);

    function mount() {
      if (guard.blocked("mount")) return false;
      try {
        return _host.attachButton(_KDB, inst);
      } catch (error) {
        console.error("[" + def.apiName + ".mount]", error);
        return false;
      }
    }

    function destroy() {
      if (guard.isDisposed()) return;
      guard.dispose();
      try {
        _host.detachButton(_KDB, inst);
      } catch (error) {
        console.error("[" + def.apiName + ".destroy]", error);
      }
    }

    return { mount: mount, destroy: destroy };
  }

  function registerToolbarButton(_KDB, def) {
    var rt = _host.ensureHostRuntime(_KDB);
    var api;
    _KDB.api = _KDB.api || {};
    if (def.onRegister) def.onRegister(_KDB, rt);
    api = createToolbarController(_KDB, def);
    if (def.extendApi) def.extendApi(_KDB, api);
    _KDB.api[def.apiName] = api;
    return api;
  }

  return { registerToolbarButton: registerToolbarButton };
});
