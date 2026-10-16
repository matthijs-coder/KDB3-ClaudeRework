define([], function () {
  "use strict";

  var hintSeq = 0;

  function isHintEnabled(_KDB) {
    return !!(_KDB && _KDB.properties && _KDB.properties.KDBHideWidgetsToggle === true);
  }

  function removeHideDataHints() {
    try {
      var nodes = document.querySelectorAll("[data-kdb-hidedata-hint]");
      var index;
      for (index = 0; index < nodes.length; index += 1) {
        if (nodes[index] && nodes[index].parentNode) {
          nodes[index].parentNode.removeChild(nodes[index]);
        }
      }
    } catch (err) {
      console.error("[properties.applyPersonalKdbHideDataHint]", err);
    }
  }

  function readHintText(_KDB) {
    try {
      var labels = _KDB && _KDB.config && _KDB.config.labels && _KDB.config.labels.de && _KDB.config.labels.de.developerMode;
      return labels && labels.hideDataBeforeSaveHint ? labels.hideDataBeforeSaveHint : "";
    } catch (err) {
      console.error("[properties.applyPersonalKdbHideDataHint]", err);
      return "";
    }
  }

  async function waitAndAppend(_KDB, _seq) {
    try {
      var tableData = _KDB && _KDB.services && _KDB.services.tableData;
      var tableInput = { tableName: "personal_kdb" };
      var tableState;
      var widgetId;
      var node;
      var text;
      var badge;
      if (!tableData || typeof tableData.waitForRows !== "function" || typeof tableData.readTableState !== "function") {
        console.error("[properties.applyPersonalKdbHideDataHint] tableData API missing");
        return;
      }
      await tableData.waitForRows([tableInput]);
      if (_seq !== hintSeq || !isHintEnabled(_KDB)) {
        return;
      }
      tableState = tableData.readTableState([tableInput]);
      widgetId = tableState && tableState.widgetId;
      if (!widgetId) {
        return;
      }
      node = document.getElementById(widgetId);
      if (!node || node.querySelector("[data-kdb-hidedata-hint]")) {
        return;
      }
      text = readHintText(_KDB);
      if (!text) {
        return;
      }
      badge = document.createElement("div");
      badge.className = "kdb-hidedata-save-hint";
      badge.setAttribute("data-kdb-hidedata-hint", "");
      badge.textContent = text;
      node.appendChild(badge);
    } catch (err) {
      console.error("[properties.applyPersonalKdbHideDataHint]", err);
    }
  }

  function applyPersonalKdbHideDataHint(_KDB) {
    try {
      if (!isHintEnabled(_KDB)) {
        removeHideDataHints();
        return;
      }
      hintSeq += 1;
      waitAndAppend(_KDB, hintSeq);
    } catch (err) {
      console.error("[properties.applyPersonalKdbHideDataHint]", err);
    }
  }

  return applyPersonalKdbHideDataHint;
});
