define([], function () {
  "use strict";

  function buildShareControls(_options) {
    var options = _options || {};
    var rootEl = document.createElement("div");
    var itemEl = document.createElement("div");
    var buttonEl = document.createElement("button");
    var iconEl = document.createElement("img");
    var labelEl = document.createElement("span");
    rootEl.className = "kdb-share-controls";
    rootEl.setAttribute("data-kdb-share-controls", "true");
    itemEl.className = "kdb-share-controls__item";
    buttonEl.type = "button";
    buttonEl.className = "kdb-share-controls__button";
    buttonEl.setAttribute("data-kdb-share-button", "true");
    if (options.accessibleName) buttonEl.setAttribute("aria-label", options.accessibleName);
    if (options.title) buttonEl.title = options.title;
    iconEl.className = "kdb-share-controls__icon";
    iconEl.setAttribute("data-kdb-share-icon", "true");
    iconEl.setAttribute("aria-hidden", "true");
    if (options.iconSrc) iconEl.src = options.iconSrc;
    if (options.invert) iconEl.className += " kdb-share-controls__icon--invert";
    labelEl.className = "kdb-share-controls__label";
    labelEl.setAttribute("data-kdb-share-label", "true");
    labelEl.textContent = options.labelText || "";
    buttonEl.appendChild(iconEl);
    buttonEl.appendChild(labelEl);
    itemEl.appendChild(buttonEl);
    rootEl.appendChild(itemEl);
    return rootEl;
  }

  return buildShareControls;
});
