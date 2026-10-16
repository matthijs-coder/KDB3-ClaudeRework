define(["./config/settingsInputs.js"], function (_inputs) {
  "use strict";

  var INPUT_ID_ATTRIBUTE = "data-placeholder-input-id";

  function readSettingsInput(event) {
    var target = event.target;
    if (!target || target.tagName !== "INPUT" || !target.getAttribute) return null;
    return _inputs.isSettingsInput(target.getAttribute(INPUT_ID_ATTRIBUTE)) ? target : null;
  }

  function dispatchInputValue(dispatch, inputEl) {
    var value = inputEl.value != null ? String(inputEl.value) : "";
    var action = _inputs.buildSettingsInputAction(inputEl.getAttribute(INPUT_ID_ATTRIBUTE), value);
    if (action) dispatch(action);
  }

  // Binds the settings panel inputs (dimensions and colours) to settings actions on the control panel content element.
  function bindSettingsForm(_KDB, surface) {
    var rt = _KDB.runtime.kdbControl;
    var contentEl = rt.domRefs.contentEl;
    if (!contentEl || !surface || typeof surface.dispatch !== "function") return;
    var previous = rt.abortControllers.settingsForm;
    if (previous) previous.abort();
    var scope = new AbortController();
    rt.abortControllers.settingsForm = scope;
    var options = { signal: scope.signal };

    function onCommit(event) {
      var inputEl = readSettingsInput(event);
      if (inputEl) dispatchInputValue(surface.dispatch, inputEl);
    }

    function onKeydown(event) {
      if (event.key !== "Enter") return;
      var inputEl = readSettingsInput(event);
      if (!inputEl) return;
      event.preventDefault();
      dispatchInputValue(surface.dispatch, inputEl);
    }

    function onInput(event) {
      var inputEl = readSettingsInput(event);
      if (inputEl && _inputs.isColorSettingsInput(inputEl.getAttribute(INPUT_ID_ATTRIBUTE))) {
        dispatchInputValue(surface.dispatch, inputEl);
      }
    }

    contentEl.addEventListener("change", onCommit, options);
    contentEl.addEventListener("focusout", onCommit, options);
    contentEl.addEventListener("keydown", onKeydown, options);
    contentEl.addEventListener("input", onInput, options);
  }

  return bindSettingsForm;
});
