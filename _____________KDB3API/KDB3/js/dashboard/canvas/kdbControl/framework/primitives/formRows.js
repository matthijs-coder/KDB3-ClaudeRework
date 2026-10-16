define(["../createFrameworkElement.js"], function (_createElement) {
  "use strict";

  function createTextInputRow(label, placeholder, inputId, initialValue) {
    var row = _createElement("div", null, "kdb-control_input-row", null);
    var labelEl = _createElement("div", null, "kdb-control_input-label", null);
    labelEl.textContent = label;
    var inputEl = _createElement("input", null, "kdb-control_text-input", {
      type: "text",
      placeholder: placeholder || "",
      "data-placeholder-input-id": inputId
    });
    if (initialValue != null && String(initialValue).trim() !== "") inputEl.value = String(initialValue).trim();
    row.appendChild(labelEl);
    row.appendChild(inputEl);
    return row;
  }

  function createActionButton(label, action) {
    var button = _createElement("button", null, "kdb-control_action-button", { type: "button", "data-kdb-action": action || "" });
    button.textContent = label;
    button.setAttribute("title", label);
    return button;
  }

  function createDraggableActionButton(label, dragType) {
    var button = _createElement("button", null, "kdb-control_action-button kdb-control_action-button--draggable", {
      type: "button",
      draggable: "true",
      "data-drag-type": dragType || "text"
    });
    button.textContent = label;
    button.setAttribute("title", label);
    return button;
  }

  function createRadioOption(name, index, option, layout) {
    var label = _createElement("label", null, "kdb-control__radio-label", null);
    var radio = _createElement("input", "kdb-fw-radio-" + name + "-" + index, "kdb-control__radio", {
      type: "radio",
      name: name,
      value: option.value
    });
    if (option.disabled) radio.setAttribute("disabled", "disabled");
    if (option.dataTabIndex != null && option.dataTabIndex !== "") radio.setAttribute("data-tab-index", String(option.dataTabIndex));
    if (layout.hideCaptions) radio.setAttribute("aria-label", option.ariaLabel || option.caption || String(option.value));
    label.setAttribute("title", option.caption != null && String(option.caption) ? String(option.caption) : option.ariaLabel || String(option.value));
    label.appendChild(radio);
    if (!layout.hideCaptions) label.appendChild(document.createTextNode(" " + option.caption));
    return label;
  }

  // Radio group; `controlId` becomes `data-placeholder-control-id` of the form row. layout: { hideCaptions, formRow }.
  function createRadioGroup(label, name, options, controlId, layoutOptions) {
    var layout = layoutOptions || {};
    var wrap = _createElement("div", null, "kdb-control_radio-group", null);
    if (label) {
      var caption = _createElement("div", null, "kdb-control_radio-group-label", null);
      caption.textContent = label;
      wrap.appendChild(caption);
    }
    var formClass = "kdb-control__gallery-row-radio kdb-control_radio-form" + (layout.formRow ? " kdb-control_radio-form--row" : "");
    var form = _createElement("div", null, formClass, { "data-placeholder-control-id": controlId || "headerEditMode" });
    options.forEach(function (option, index) {
      form.appendChild(createRadioOption(name, index, option, layout));
    });
    wrap.appendChild(form);
    return wrap;
  }

  // Collapsible section: a head (`data-section-id`, toggled by the section binder) and a body filled by `bodyBuilder`.
  function createExpandableSection(sectionId, label, bodyBuilder, _KDB) {
    var row = _createElement("div", null, "kdb-control__section kdb-control__section-shell", null);
    var head = _createElement("div", null, "kdb-control__section-head", {
      "data-section-id": sectionId,
      role: "button",
      tabindex: "0"
    });
    head.textContent = label;
    head.setAttribute("title", label);
    var bodyWrap = _createElement("div", null, "kdb-control__section-body-container", null);
    var body = _createElement("div", null, "kdb-control__section-body", null);
    if (typeof bodyBuilder === "function") bodyBuilder(body, _KDB);
    bodyWrap.appendChild(body);
    row.appendChild(head);
    row.appendChild(bodyWrap);
    return row;
  }

  return {
    createTextInputRow: createTextInputRow,
    createActionButton: createActionButton,
    createDraggableActionButton: createDraggableActionButton,
    createRadioGroup: createRadioGroup,
    createExpandableSection: createExpandableSection
  };
});
