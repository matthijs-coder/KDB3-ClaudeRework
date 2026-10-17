define(["../createPanelElement.js"], function (_createElement) {
  "use strict";

  // Checkbox switch row. Options: action (`data-kdb-action`), checked, ariaLabel, title (default: label, or ariaLabel for the
  // icon variant), label (text caption) or iconSrc (glyph caption; the row then uses the icon variant).
  function createToggleSwitch(options) {
    var hasIcon = options.iconSrc !== undefined;
    var row = _createElement("label", null,
      hasIcon ? "kdb-control_switch-row kdb-control_switch-row--icon KDB_ToggleButton" : "kdb-control_switch-row KDB_ToggleButton", null);
    var caption = _createElement("span", null,
      hasIcon ? "kdb-control_switch-label kdb-control_switch-label--glyph" : "kdb-control_switch-label", null);
    if (hasIcon) {
      if (options.iconSrc) {
        var img = document.createElement("img");
        img.className = "kdb-control_switch-icon";
        img.src = options.iconSrc;
        img.alt = "";
        img.setAttribute("role", "presentation");
        caption.appendChild(img);
      }
    } else {
      caption.textContent = options.label;
    }
    var track = _createElement("span", null, "kdb-control_switch-track", null);
    var checkbox = _createElement("input", null, "kdb-control_switch-input", {
      type: "checkbox",
      "data-kdb-action": options.action || ""
    });
    if (options.ariaLabel) checkbox.setAttribute("aria-label", options.ariaLabel);
    if (options.checked) checkbox.setAttribute("checked", "checked");
    var slider = _createElement("span", null, "KDB_ToggleButton_slider KDB_ToggleButton_round", null);
    track.appendChild(checkbox);
    track.appendChild(slider);
    row.appendChild(caption);
    row.appendChild(track);
    var title = options.title !== undefined ? options.title : hasIcon ? options.ariaLabel : options.label;
    if (!hasIcon || title) row.setAttribute("title", title);
    return row;
  }

  return { createToggleSwitch: createToggleSwitch };
});
