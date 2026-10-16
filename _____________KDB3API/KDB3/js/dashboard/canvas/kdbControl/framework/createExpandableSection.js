define(["./createFrameworkElement"], function (_createFrameworkElement) {
  "use strict";
  function createExpandableSection(sectionId, label, bodyBuilder, _KDB) {
    try {
      var row = _createFrameworkElement("div", null, "kdb-control__section kdb-control__section-shell", null);
      var head = _createFrameworkElement("div", null, "kdb-control__section-head", {
        "data-section-id": sectionId,
        role: "button",
        tabindex: "0",
      });
      head.textContent = label;
      head.setAttribute("title", label);
      var bodyWrap = _createFrameworkElement("div", null, "kdb-control__section-body-container", null);
      var body = _createFrameworkElement("div", null, "kdb-control__section-body", null);
      if (typeof bodyBuilder === "function") bodyBuilder(body, _KDB);
      bodyWrap.appendChild(body);
      row.appendChild(head);
      row.appendChild(bodyWrap);
      return row;
    } catch (err) {
      console.error("[kdbControl.createExpandableSection] failed", err);
      throw err;
    }
  }
  return createExpandableSection;
});
