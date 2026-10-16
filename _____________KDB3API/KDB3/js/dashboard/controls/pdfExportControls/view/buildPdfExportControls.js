define([], function () {
  "use strict";

  function buildPdfExportControls(_options) {
    var options = _options || {};
    var rootEl = document.createElement("div");
    var itemEl = document.createElement("div");
    var buttonEl = document.createElement("button");
    var iconEl = document.createElement("img");
    var labelEl = document.createElement("span");
    rootEl.className = "kdb-pdf-export-controls";
    rootEl.setAttribute("data-kdb-pdf-export-controls", "true");
    itemEl.className = "kdb-pdf-export-controls__item";
    buttonEl.type = "button";
    buttonEl.className = "kdb-pdf-export-controls__button";
    buttonEl.setAttribute("data-kdb-pdf-export-button", "true");
    buttonEl.setAttribute("aria-label", "Dashboard als PDF exportieren");
    buttonEl.title = "Dashboard als PDF exportieren";
    iconEl.className = "kdb-pdf-export-controls__icon";
    iconEl.setAttribute("data-kdb-pdf-export-icon", "true");
    iconEl.setAttribute("aria-hidden", "true");
    if (options.iconSrc) iconEl.src = options.iconSrc;
    labelEl.className = "kdb-pdf-export-controls__label";
    labelEl.setAttribute("data-kdb-pdf-export-label", "true");
    labelEl.setAttribute("aria-live", "polite");
    labelEl.setAttribute("aria-atomic", "true");
    labelEl.textContent = "PDF";
    buttonEl.appendChild(iconEl);
    buttonEl.appendChild(labelEl);
    itemEl.appendChild(buttonEl);
    rootEl.appendChild(itemEl);
    return rootEl;
  }

  return buildPdfExportControls;
});
