define([], function () {
  "use strict";

  var HINT_SELECTOR = "[data-kdb-hidedata-hint]";
  var TABLE_INPUT = { tableName: "personal_kdb" };

  function isHintEnabled(_KDB) {
    return !!(_KDB && _KDB.properties && _KDB.properties.KDBHideWidgetsToggle === true);
  }

  function removeHideDataHints() {
    var nodes = document.querySelectorAll(HINT_SELECTOR);
    var index;
    for (index = 0; index < nodes.length; index += 1) {
      if (nodes[index] && nodes[index].parentNode) {
        nodes[index].parentNode.removeChild(nodes[index]);
      }
    }
  }

  function readHintText(_KDB) {
    var labels = _KDB && _KDB.config && _KDB.config.labels && _KDB.config.labels.de && _KDB.config.labels.de.developerMode;
    return labels && labels.hideDataBeforeSaveHint ? labels.hideDataBeforeSaveHint : "";
  }

  // A disposed instance (controller removed) or a newer request makes this one stale.
  function isStale(_KDB, _seq) {
    var runtime = _KDB && _KDB.runtime && _KDB.runtime.properties;
    return !runtime || !runtime.controller || runtime.hintSeq !== _seq || !isHintEnabled(_KDB);
  }

  // Fire-and-forget: nobody awaits the badge, so failures are logged here.
  async function waitAndAppend(_KDB, _seq) {
    var tableData = _KDB && _KDB.services && _KDB.services.tableData;
    var tableState, widgetId, node, text, badge;
    try {
      if (!tableData || typeof tableData.waitForRows !== "function" || typeof tableData.readTableState !== "function") {
        console.error("[properties.applyPersonalKdbHideDataHint] tableData API missing");
        return;
      }
      await tableData.waitForRows([TABLE_INPUT]);
      if (isStale(_KDB, _seq)) {
        return;
      }
      tableState = tableData.readTableState([TABLE_INPUT]);
      widgetId = tableState && tableState.widgetId;
      if (!widgetId) {
        return;
      }
      node = document.getElementById(widgetId);
      text = readHintText(_KDB);
      if (!node || !text || node.querySelector(HINT_SELECTOR)) {
        return;
      }
      badge = document.createElement("div");
      badge.className = "kdb-hidedata-save-hint";
      badge.setAttribute("data-kdb-hidedata-hint", "");
      badge.textContent = text;
      node.appendChild(badge);
    } catch (error) {
      console.error("[properties.applyPersonalKdbHideDataHint]", error);
    }
  }

  function applyPersonalKdbHideDataHint(_KDB) {
    var runtime;
    if (!isHintEnabled(_KDB)) {
      removeHideDataHints();
      return;
    }
    runtime = _KDB.runtime.properties;
    runtime.hintSeq += 1;
    waitAndAppend(_KDB, runtime.hintSeq);
  }

  return applyPersonalKdbHideDataHint;
});
