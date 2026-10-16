define([
  "./createFrameworkElement.js",
  "./primitives/toggleSwitch.js",
  "./primitives/formRows.js",
  "./settingsRows.js",
  "../config/labels.js"
], function (_createElement, _toggleSwitch, _formRows, _rows, _labels) {
  "use strict";

  var TEXTS = _labels.toolbox;

  function createSubheading(text) {
    var heading = _createElement("div", null, "kdb-control_subheading", null);
    heading.textContent = text;
    return heading;
  }

  function buildCommentsSection(body) {
    var row = _rows.createOneInputRow();
    var hint = _createElement("div", null, "kdb-control_toolbox-hint", null);
    hint.textContent = TEXTS.commentHint;
    row.appendChild(hint);
    var button = _formRows.createDraggableActionButton(TEXTS.commentButton, "text");
    button.setAttribute("data-kdb-toolbox-placeholder", "comments.startCreate");
    row.appendChild(button);
    body.appendChild(row);
  }

  function buildTabEditOptions() {
    var options = [];
    var index;
    for (index = 0; index < TEXTS.tabEditCount; index += 1) {
      options.push({ value: "tabEdit_tab" + index, caption: TEXTS.tabLabel(index), ariaLabel: TEXTS.tabAriaLabel(index), dataTabIndex: index });
    }
    return options;
  }

  function buildTabsSection(body) {
    var addBlock = _createElement("div", null, "kdb-control_toolbox-block kdb-control_toolbox-block--tab-add", null);
    var hint = _createElement("div", null, "kdb-control_toolbox-hint", null);
    hint.textContent = TEXTS.tabHint;
    addBlock.appendChild(hint);
    addBlock.appendChild(_formRows.createActionButton(TEXTS.tabButton, "tabs.add"));
    var addRow = _rows.createOneInputRow();
    addRow.appendChild(addBlock);
    body.appendChild(addRow);

    var editArea = _createElement("div", null, "kdb-control_tab-edit-area", null);
    var heading = _createElement("div", null, "kdb-control_subheading", { title: TEXTS.tabEditHeading });
    heading.textContent = TEXTS.tabEditHeading.replace(/\//g, "/\u200B");
    editArea.appendChild(heading);
    var radios = _createElement("div", null, "kdb-control_tab-edit-placeholder", null);
    radios.appendChild(_formRows.createRadioGroup("", "kdb-tab-edit-actions", buildTabEditOptions(), "tabEditActions", {
      hideCaptions: true,
      formRow: true
    }));
    editArea.appendChild(radios);
    body.appendChild(editArea);
  }

  function buildHeaderFooterSection(body) {
    body.classList.add("kdb-control_toolbox-header-footer");
    var captionRow = _rows.createOneInputRow();
    captionRow.appendChild(createSubheading(TEXTS.showCaption));
    body.appendChild(captionRow);

    var showRow = _rows.createTwoInputRow();
    showRow.id = "kdb-control_toolbox-header-footer-row-kopf-fuss";
    _rows.appendTwoInputSplit(showRow,
      _toggleSwitch.createToggleSwitch({ label: TEXTS.header, action: "header.toggle", checked: false }),
      _toggleSwitch.createToggleSwitch({ label: TEXTS.footer, action: "footer.toggle", checked: false }));
    body.appendChild(showRow);

    var editRow = _rows.createTwoInputRow("kdb-control_header-footer-row2");
    var editColumn = _createElement("div", null, "kdb-control_header-footer-edit-column", null);
    editColumn.appendChild(createSubheading(TEXTS.editTitle));
    editColumn.appendChild(_formRows.createRadioGroup(null, "kdb-header-edit", [
      { value: "renameHeader", caption: TEXTS.editTitle, ariaLabel: TEXTS.editTitle },
      { value: "renameHeaderSubtitle", caption: TEXTS.editTitleAndSubtitle, ariaLabel: TEXTS.editTitleAndSubtitle }
    ], "headerEditMode", { hideCaptions: true, formRow: true }));
    _rows.appendTwoInputSplit(editRow,
      _toggleSwitch.createToggleSwitch({ label: TEXTS.subtitle, action: "header.subtitle.toggle", checked: false }),
      editColumn);
    body.appendChild(editRow);
  }

  function buildToolboxPanel(_KDB) {
    var sections = _labels.sections;
    var panel = _createElement("div", "kdb-control_toolbox_container", "kdb-control__panel kdb-control__panel-toolbox", null);
    panel.appendChild(_formRows.createExpandableSection("toolboxComments", sections.toolboxComments, buildCommentsSection, _KDB));
    panel.appendChild(_formRows.createExpandableSection("toolboxTabs", sections.toolboxTabs, buildTabsSection, _KDB));
    panel.appendChild(_formRows.createExpandableSection("toolboxHeaderFooter", sections.toolboxHeaderFooter, buildHeaderFooterSection, _KDB));
    return panel;
  }

  return buildToolboxPanel;
});
