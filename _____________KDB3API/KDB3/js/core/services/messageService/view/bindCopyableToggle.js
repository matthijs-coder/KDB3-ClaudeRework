define([], function () {
  "use strict";

  function syncCopyableToggleFromInput(_handle, _request, _event) {
    var inputEl;
    var toggle;
    var url;
    try {
      inputEl = _handle.toggleInputEl;
      toggle = _request.options.toggle;
      url = inputEl.checked === true ? toggle.copyTextChecked : toggle.copyTextUnchecked;
      _request.options.copyText = url;
      _handle.copyTextEl.value = url;
    } catch (err) {
      console.error("[messageService.bindCopyableToggle] failed", err);
    }
  }

  function bindCopyableToggle(_registerListener, _runtime, _handle, _request) {
    try {
      if (!_handle.toggleInputEl || !_handle.copyTextEl) return;
      _registerListener(_runtime, _handle, _handle.toggleInputEl, "change", syncCopyableToggleFromInput.bind(null, _handle, _request));
    } catch (err) {
      console.error("[messageService.bindCopyableToggle] failed", err);
    }
  }

  return bindCopyableToggle;
});
