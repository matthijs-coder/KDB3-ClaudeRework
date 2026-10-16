define([], function () {
  "use strict";

  function __controller(_spinnerEl, _caption) {
    try {
      var captionEl;
      if (!_spinnerEl) {
        return;
      }
      captionEl = _spinnerEl.querySelector(".KDB_loadingMessage");
      if (!captionEl) {
        captionEl = document.createElement("p");
        captionEl.className = "KDB_loadingMessage";
        _spinnerEl.appendChild(captionEl);
      }
      captionEl.textContent = _caption || "";
      captionEl.hidden = !_caption;
    } catch (error) {
      console.error("[loadingService.syncLoadingCaption] failed", error);
      throw error;
    }
  }

  return __controller;
});
