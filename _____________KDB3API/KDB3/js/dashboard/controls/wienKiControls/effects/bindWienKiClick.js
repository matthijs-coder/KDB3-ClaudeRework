define([
  "./openWienKiInstructionDialog.js"
], function (_openWienKiInstructionDialog) {
  "use strict";

  function onWienKiClick(_KDB) {
    var runtime;
    var viewModel;
    try {
      runtime = _KDB.runtime.wienKiControls;
      viewModel = runtime.viewModel || {};
      if (viewModel.serviceAvailable === false || viewModel.disabled === true) return;
      _openWienKiInstructionDialog(_KDB);
    } catch (err) {
      console.error("[wienKiControls.click]", err);
    }
  }

  function clearWienKiClick(_buttonEl, _onClick, _runtime) {
    _buttonEl.removeEventListener("click", _onClick);
    _runtime.listeners.clickCleanup = null;
  }

  function bindWienKiClick(_KDB) {
    var runtime = _KDB.runtime.wienKiControls;
    var buttonEl = runtime.domRefs.buttonEl;
    var onClick;
    try {
      if (!buttonEl) return false;
      if (runtime.listeners.clickCleanup) runtime.listeners.clickCleanup();
      onClick = onWienKiClick.bind(null, _KDB);
      buttonEl.addEventListener("click", onClick);
      runtime.listeners.clickCleanup = clearWienKiClick.bind(null, buttonEl, onClick, runtime);
      return true;
    } catch (err) {
      console.error("[wienKiControls.bindWienKiClick]", err);
      return false;
    }
  }

  return bindWienKiClick;
});
