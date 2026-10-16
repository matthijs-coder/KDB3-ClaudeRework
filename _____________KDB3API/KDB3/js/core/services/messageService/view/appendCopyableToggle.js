define([], function () {
  "use strict";

  function isCopyableToggleValid(_toggle) {
    if (!_toggle || typeof _toggle !== "object") return false;
    if (typeof _toggle.label !== "string" || _toggle.label === "") return false;
    if (typeof _toggle.title !== "string") return false;
    if (typeof _toggle.isChecked !== "boolean") return false;
    if (typeof _toggle.copyTextChecked !== "string" || _toggle.copyTextChecked === "") return false;
    if (typeof _toggle.copyTextUnchecked !== "string" || _toggle.copyTextUnchecked === "") return false;
    return true;
  }

  function appendCopyableToggle(_ownerDocument, _bodyEl, _options) {
    var toggle;
    var wrapperEl;
    var labelEl;
    var labelTextEl;
    var trackEl;
    var inputEl;
    var sliderEl;
    try {
      toggle = (_options || {}).toggle;
      if (!isCopyableToggleValid(toggle)) {
        if (toggle !== undefined) console.warn("[messageService.appendCopyableToggle] invalid toggle ignored");
        return null;
      }
      wrapperEl = _ownerDocument.createElement("div");
      wrapperEl.className = "kdb-message-dialog__toggle";
      labelEl = _ownerDocument.createElement("label");
      labelEl.className = "kdb-control_switch-row KDB_ToggleButton";
      labelEl.setAttribute("title", toggle.title || toggle.label);
      labelTextEl = _ownerDocument.createElement("span");
      labelTextEl.className = "kdb-control_switch-label";
      labelTextEl.textContent = toggle.label;
      trackEl = _ownerDocument.createElement("span");
      trackEl.className = "kdb-control_switch-track";
      inputEl = _ownerDocument.createElement("input");
      inputEl.type = "checkbox";
      inputEl.className = "kdb-control_switch-input";
      inputEl.checked = toggle.isChecked === true;
      inputEl.setAttribute("aria-label", toggle.label);
      sliderEl = _ownerDocument.createElement("span");
      sliderEl.className = "KDB_ToggleButton_slider KDB_ToggleButton_round";
      trackEl.appendChild(inputEl);
      trackEl.appendChild(sliderEl);
      labelEl.appendChild(labelTextEl);
      labelEl.appendChild(trackEl);
      wrapperEl.appendChild(labelEl);
      _bodyEl.appendChild(wrapperEl);
      return inputEl;
    } catch (err) {
      console.error("[messageService.appendCopyableToggle] failed", err);
      return null;
    }
  }

  return appendCopyableToggle;
});
