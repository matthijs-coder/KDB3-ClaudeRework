define([], function () {
  "use strict";

  function syncPdfExportControlsView(_KDB, _viewModel) {
    var selectors = _KDB.elements.selectors.pdfExportControls || {};
    var runtime = _KDB.runtime.pdfExportControls;
    var rootEl = runtime.domRefs.rootEl;
    var buttonEl = runtime.domRefs.buttonEl;
    var labelEl = runtime.domRefs.labelEl;
    var label = _viewModel.label || "PDF";
    var unavailableClassName = selectors.unavailableClassName || "is-unavailable";
    var shouldBeUnavailable = _viewModel.serviceAvailable !== true || _viewModel.busy === true;
    if (!buttonEl || !labelEl) return false;
    buttonEl.disabled = _viewModel.disabled === true;
    if (labelEl.textContent !== label) labelEl.textContent = label;
    if (rootEl && rootEl.classList) {
      if (shouldBeUnavailable) rootEl.classList.add(unavailableClassName);
      else rootEl.classList.remove(unavailableClassName);
    }
    buttonEl.setAttribute("aria-busy", _viewModel.busy === true ? "true" : "false");
    return true;
  }

  return syncPdfExportControlsView;
});
