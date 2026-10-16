define([
  "./createFrameworkElement",
  "./buildControlPrimitiveGallery",
  "./appendTwoInputSplit",
], function (_createFrameworkElement, _primitiveGallery, _appendTwoInputSplit) {
  "use strict";
  function fillToolboxHeaderFooter(body, _KDB) {
    try {
      void _KDB;
      var P = _primitiveGallery;
      body.classList.add("kdb-control_toolbox-header-footer");
      var capRow = _createFrameworkElement("div", null, "kdb-control_settings-inline-row kdb-control_oneinput-row", null);
      var cap = _createFrameworkElement("div", null, "kdb-control_subheading", null);
      cap.textContent = "Anzeigen:";
      capRow.appendChild(cap);
      body.appendChild(capRow);
      var r1 = _createFrameworkElement("div", "kdb-control_toolbox-header-footer-row-kopf-fuss", "kdb-control_settings-inline-row kdb-control_twoinput-row", null);
      _appendTwoInputSplit(r1, P.createToggleSwitch("Kopfzeile", "header.toggle", false), P.createToggleSwitch("Fußzeile", "footer.toggle", false));
      body.appendChild(r1);
      var r2 = _createFrameworkElement("div", null, "kdb-control_settings-inline-row kdb-control_twoinput-row kdb-control_header-footer-row2", null);
      var editTextCol = _createFrameworkElement("div", null, "kdb-control_header-footer-edit-column", null);
      var editTextCap = _createFrameworkElement("div", null, "kdb-control_subheading", null);
      editTextCap.textContent = "Titel bearbeiten";
      editTextCol.appendChild(editTextCap);
      editTextCol.appendChild(
        P.createRadioGroup(null, "kdb-header-edit", [
          { value: "renameHeader", caption: "Titel bearbeiten", ariaLabel: "Titel bearbeiten" },
          { value: "renameHeaderSubtitle", caption: "Titel und Untertitel bearbeiten", ariaLabel: "Titel und Untertitel bearbeiten" },
        ], "headerEditMode", { hideCaptions: true, formRow: true })
      );
      _appendTwoInputSplit(r2, P.createToggleSwitch("Untertitel anzeigen", "header.subtitle.toggle", false), editTextCol);
      body.appendChild(r2);
    } catch (err) {
      console.error("[kdbControl.fillToolboxHeaderFooter] failed", err);
      throw err;
    }
  }
  return fillToolboxHeaderFooter;
});
