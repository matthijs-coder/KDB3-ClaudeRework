define(["./createFrameworkElement"], function (_createFrameworkElement) {

  "use strict";

  function makeToggle(panelId, label, extraId) {

    var b = _createFrameworkElement(

      "button",

      extraId || null,

      "kdb-control__top-toggle kdb-toggle",

      { type: "button", "data-panel-id": panelId }

    );

    b.textContent = label;

    b.setAttribute("title", label);

    return b;

  }

  function __controller(_KDB) {

    void _KDB;

    var row = _createFrameworkElement("div", "kdb-control-main-toggles", "kdb-control__main-toggles", null);

    row.appendChild(makeToggle("metrics", "Kennzahlen", "kdb-control_metrics_toggle"));

    row.appendChild(makeToggle("toolbox", "Toolbox", null));

    return row;

  }

  return __controller;

});

