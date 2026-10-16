define([], function () {
  "use strict";

  function syncWienKiControlsView(_KDB, _viewModel) {
    var selectors = _KDB.elements.selectors.wienKiControls || {};
    var runtime = _KDB.runtime.wienKiControls;
    var rootEl = runtime.domRefs.rootEl;
    var buttonEl = runtime.domRefs.buttonEl;
    var labelEl = runtime.domRefs.labelEl;
    var viewModel = _viewModel || {};
    var label = viewModel.label || "";
    var unavailableClassName = selectors.unavailableClassName || "is-unavailable";
    try {
      if (!buttonEl) return false;
      buttonEl.disabled = viewModel.disabled === true;
      if (labelEl && labelEl.textContent !== label) labelEl.textContent = label;
      if (rootEl && rootEl.classList) {
        if (viewModel.serviceAvailable !== true) rootEl.classList.add(unavailableClassName);
        else rootEl.classList.remove(unavailableClassName);
      }
      return true;
    } catch (err) {
      console.error("[wienKiControls.syncWienKiControlsView]", err);
      throw err;
    }
  }

  return syncWienKiControlsView;
});
