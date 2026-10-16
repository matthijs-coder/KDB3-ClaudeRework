define([], function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var ICON_D = "M5.5 1.6h13a3.1 3.1 0 0 1 3.1 3.1v8.6a3.1 3.1 0 0 1-3.1 3.1h-7.4L4.2 22.2l2.2-5.8H5.5A3.1 3.1 0 0 1 2.4 13.3V4.7A3.1 3.1 0 0 1 5.5 1.6zM6.15 4.7h2.35v3.15L12.05 4.7h2.55L11.1 8.85l3.75 5.15h-2.6L8.5 9.85v4.15H6.15zm9.7 0h2.4v9.3h-2.4z";

  function buildSpeechBubbleIcon() {
    var svgEl = document.createElementNS(SVG_NS, "svg");
    var pathEl = document.createElementNS(SVG_NS, "path");
    svgEl.setAttribute("viewBox", "0 0 24 24");
    svgEl.setAttribute("width", "24");
    svgEl.setAttribute("height", "24");
    svgEl.setAttribute("class", "kdb-wien-ki-controls__icon");
    svgEl.setAttribute("data-kdb-wien-ki-icon", "true");
    svgEl.setAttribute("aria-hidden", "true");
    svgEl.setAttribute("focusable", "false");
    pathEl.setAttribute("fill", "currentColor");
    pathEl.setAttribute("fill-rule", "evenodd");
    pathEl.setAttribute("d", ICON_D);
    svgEl.appendChild(pathEl);
    return svgEl;
  }

  function buildWienKiControls(_options) {
    var options = _options || {};
    var rootEl = document.createElement("div");
    var itemEl = document.createElement("div");
    var buttonEl = document.createElement("button");
    var labelEl = document.createElement("span");
    try {
      rootEl.className = "kdb-wien-ki-controls";
      rootEl.setAttribute("data-kdb-wien-ki-controls", "true");
      itemEl.className = "kdb-wien-ki-controls__item";
      buttonEl.type = "button";
      buttonEl.className = "kdb-wien-ki-controls__button";
      buttonEl.setAttribute("data-kdb-wien-ki-button", "true");
      if (options.accessibleName) buttonEl.setAttribute("aria-label", options.accessibleName);
      if (options.title) buttonEl.title = options.title;
      labelEl.className = "kdb-wien-ki-controls__label";
      labelEl.setAttribute("data-kdb-wien-ki-label", "true");
      labelEl.textContent = options.labelText || "";
      buttonEl.appendChild(buildSpeechBubbleIcon());
      buttonEl.appendChild(labelEl);
      itemEl.appendChild(buttonEl);
      rootEl.appendChild(itemEl);
      return rootEl;
    } catch (err) {
      console.error("[wienKiControls.buildWienKiControls]", err);
      throw err;
    }
  }

  return buildWienKiControls;
});
