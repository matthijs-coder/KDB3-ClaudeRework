define([], function () {
  "use strict";

  function syncShareControlsView(_KDB, _viewModel) {
    var selectors = _KDB.elements.selectors.shareControls || {};
    var runtime = _KDB.runtime.shareControls;
    var rootEl = runtime.domRefs.rootEl;
    var buttonEl = runtime.domRefs.buttonEl;
    var labelEl = runtime.domRefs.labelEl;
    var viewModel = _viewModel || {};
    var label = viewModel.label || "";
    var unavailableClassName = selectors.unavailableClassName || "is-unavailable";
    if (!buttonEl) return false;
    buttonEl.disabled = viewModel.disabled === true;
    if (labelEl && labelEl.textContent !== label) labelEl.textContent = label;
    if (rootEl && rootEl.classList) {
      if (viewModel.serviceAvailable !== true) rootEl.classList.add(unavailableClassName);
      else rootEl.classList.remove(unavailableClassName);
    }
    return true;
  }

  return syncShareControlsView;
});
