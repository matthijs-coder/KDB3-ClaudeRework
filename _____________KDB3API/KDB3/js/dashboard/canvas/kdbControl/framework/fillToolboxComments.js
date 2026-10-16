define([
  "./createFrameworkElement",
  "./buildControlPrimitiveGallery",
], function (_createFrameworkElement, _primitiveGallery) {
  "use strict";
  function fillToolboxComments(body, _KDB) {
    try {
      void _KDB;
      var row = _createFrameworkElement("div", null, "kdb-control_settings-inline-row kdb-control_oneinput-row", null);
      var lab = _createFrameworkElement("div", null, "kdb-control_toolbox-hint", null);
      lab.textContent = "neues Kommentar hinzufügen";
      row.appendChild(lab);
      const komBtn = _primitiveGallery.createDraggableActionButton("Kommentar", "text");
      komBtn.setAttribute("data-kdb-toolbox-placeholder", "comments.startCreate");
      row.appendChild(komBtn);
      body.appendChild(row);
    } catch (err) {
      console.error("[kdbControl.fillToolboxComments] failed", err);
      throw err;
    }
  }
  return fillToolboxComments;
});
