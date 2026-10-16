define([

  "./createFrameworkElement",

  "./buildControlHeader",

  "./buildControlMainToggles",

  "./buildControlMainBlocks",

  "../config/domSelectors",

], function (_createFrameworkElement, _buildControlHeader, _buildControlMainToggles, _buildControlMainBlocks, _domSelectors) {

  "use strict";

  function __controller(_KDB) {
    try {
      return buildControlShell(_KDB);
    } catch (err) {
      console.error("[kdbControl.buildControlShell] failed", err);
      throw err;
    }
  }

  function buildControlShell(_KDB) {

    var root = _createFrameworkElement("div", "kdb-control-root", "kdb-control", null);

    var content = _createFrameworkElement("div", "kdb-control-content", "kdb-control__content", null);

    content.appendChild(_buildControlHeader(_KDB));

    var settingsOuter = _createFrameworkElement("div", "kdb-control-settings-outer", "kdb-control__settings-outer", null);

    var panels = _buildControlMainBlocks(_KDB);

    settingsOuter.appendChild(panels.settings);

    var saveLoadSlot = _createFrameworkElement("div", _domSelectors.saveLoadSlotId, "kdb-control__save-load-slot", { "aria-hidden": "true" });

    var mainToggles = _buildControlMainToggles(_KDB);

    panels.mainBlocks.appendChild(panels.metrics);

    panels.mainBlocks.appendChild(panels.toolbox);

    content.appendChild(settingsOuter);

    content.appendChild(saveLoadSlot);

    content.appendChild(mainToggles);

    content.appendChild(panels.mainBlocks);

    root.appendChild(content);

    var arrow = _createFrameworkElement("button", "kdb-control-arrow", "kdb-control__collapse-arrow", {

      type: "button",

      "aria-expanded": "true",

    });

    arrow.textContent = "\u25c0";

    arrow.setAttribute("title", arrow.textContent);

    root.appendChild(arrow);

    return root;

  }

  return __controller;

});
