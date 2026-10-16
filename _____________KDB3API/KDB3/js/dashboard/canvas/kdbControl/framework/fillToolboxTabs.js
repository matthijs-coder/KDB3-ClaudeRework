define([
  "./createFrameworkElement",
  "./buildControlPrimitiveGallery",
], function (_createFrameworkElement, _primitiveGallery) {
  "use strict";
  function fillToolboxTabs(body, _KDB) {
    try {
      void _KDB;
      var P = _primitiveGallery;
      var row = _createFrameworkElement("div", null, "kdb-control_toolbox-block kdb-control_toolbox-block--tab-add", null);
      var lab = _createFrameworkElement("div", null, "kdb-control_toolbox-hint", null);
      lab.textContent = "Neuen Tab hinzufügen";
      row.appendChild(lab);
      row.appendChild(P.createActionButton("Tab hinzufügen", "tabs.add"));
      var rowOuter = _createFrameworkElement("div", null, "kdb-control_settings-inline-row kdb-control_oneinput-row", null);
      rowOuter.appendChild(row);
      body.appendChild(rowOuter);
      var edit = _createFrameworkElement("div", null, "kdb-control_tab-edit-area", null);
      var editHeading = "Tabs umbenennen/löschen/duplizieren/verschieben";
      var editLab = _createFrameworkElement("div", null, "kdb-control_subheading", { title: editHeading });
      editLab.textContent = editHeading.replace(/\//g, "/\u200B");
      edit.appendChild(editLab);
      var ph = _createFrameworkElement("div", null, "kdb-control_tab-edit-placeholder", null);
      ph.appendChild(
        P.createRadioGroup(
          "",
          "kdb-tab-edit-actions",
          [
            { value: "tabEdit_tab0", caption: "Tab 1", ariaLabel: "Tab 1 bearbeiten", dataTabIndex: 0 },
            { value: "tabEdit_tab1", caption: "Tab 2", ariaLabel: "Tab 2 bearbeiten", dataTabIndex: 1 },
            { value: "tabEdit_tab2", caption: "Tab 3", ariaLabel: "Tab 3 bearbeiten", dataTabIndex: 2 },
            { value: "tabEdit_tab3", caption: "Tab 4", ariaLabel: "Tab 4 bearbeiten", dataTabIndex: 3 },
            { value: "tabEdit_tab4", caption: "Tab 5", ariaLabel: "Tab 5 bearbeiten", dataTabIndex: 4 },
          ],
          "tabEditActions",
          { hideCaptions: true, formRow: true }
        )
      );
      edit.appendChild(ph);
      body.appendChild(edit);
    } catch (err) {
      console.error("[kdbControl.fillToolboxTabs] failed", err);
      throw err;
    }
  }
  return fillToolboxTabs;
});
