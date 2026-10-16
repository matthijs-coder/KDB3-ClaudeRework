define([
  "./createFrameworkElement",
  "./createExpandableSection",
  "./fillToolboxComments",
  "./fillToolboxTabs",
  "./fillToolboxHeaderFooter",
], function (
  _createFrameworkElement,
  _createExpandableSection,
  _fillToolboxComments,
  _fillToolboxTabs,
  _fillToolboxHeaderFooter
) {
  "use strict";
  function buildToolboxBlock(_KDB) {
    try {
      var toolbox = _createFrameworkElement("div", "kdb-control_toolbox_container", "kdb-control__panel kdb-control__panel-toolbox", null);
      toolbox.appendChild(_createExpandableSection("toolboxComments", "Kommentar", _fillToolboxComments, _KDB));
      toolbox.appendChild(_createExpandableSection("toolboxTabs", "Tab", _fillToolboxTabs, _KDB));
      toolbox.appendChild(_createExpandableSection("toolboxHeaderFooter", "Kopfzeile/Fußzeile", _fillToolboxHeaderFooter, _KDB));
      return toolbox;
    } catch (err) {
      console.error("[kdbControl.buildToolboxBlock] failed", err);
      throw err;
    }
  }
  return buildToolboxBlock;
});
