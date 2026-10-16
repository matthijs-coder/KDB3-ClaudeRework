define([
  "../../../../core/config/visualizations/topNHelper.js",
  "../runtime.js"
], function (_topNHelperConfig, _visRuntime) {
  "use strict";

  var STICHTAG_UNAVAILABLE = "WIDGET_TOPN_STICHTAG_UNAVAILABLE";
  var RESULT_PICK_FALLBACK = ["d", "label", "caption", "value", "v", "u"];

  function stichtagUnavailable(_errorMessage) {
    return {
      errorCode: STICHTAG_UNAVAILABLE,
      errorMessage: String(_errorMessage || "NewestStichtag period pin is unavailable.")
    };
  }

  function rejectStichtagUnavailable(_errorMessage) {
    return Promise.reject(stichtagUnavailable(_errorMessage));
  }

  async function reloadNewestStichtagPeriodPin(_KDB) {
    try {
      var tableData = _KDB && _KDB.services && _KDB.services.tableData;
      var jahrFilter = _topNHelperConfig.jahrFilter || {};
      var tableName = jahrFilter.tableName || "newestStichtag";
      var pick = Array.isArray(_topNHelperConfig.resultPick) && _topNHelperConfig.resultPick.length
        ? _topNHelperConfig.resultPick
        : RESULT_PICK_FALLBACK;
      var input = [{ tableName: tableName, shape: "row", pick: pick }];
      var tableState;
      var leftoverId;
      var widgetsFacet;
      var outcome;
      if (!tableData || typeof tableData.reloadTable !== "function") {
        return rejectStichtagUnavailable("tableData.reloadTable is unavailable.");
      }
      await tableData.reloadTable(input);
      tableState = tableData.readTableState([{ tableName: tableName }]);
      leftoverId = tableState && tableState.widgetId;
      if (!leftoverId) {
        return rejectStichtagUnavailable("NewestStichtag leftover widgetId is unavailable.");
      }
      widgetsFacet = _visRuntime.readHostFacet(_KDB, "widgetsFacet");
      if (!widgetsFacet || typeof widgetsFacet.renderWidget !== "function") {
        return rejectStichtagUnavailable("widgetsFacet.renderWidget is unavailable.");
      }
      outcome = await widgetsFacet.renderWidget(leftoverId);
      if (!outcome || outcome.ok !== true) {
        return rejectStichtagUnavailable("widgetsFacet.renderWidget is unavailable.");
      }
      return await tableData.reloadTable(input);
    } catch (err) {
      if (err && err.errorCode === STICHTAG_UNAVAILABLE) {
        return Promise.reject(err);
      }
      console.error("[widgetVis.reloadNewestStichtagPeriodPin] failed", err);
      return rejectStichtagUnavailable(
        err && (err.errorMessage || err.message)
          ? (err.errorMessage || err.message)
          : "NewestStichtag period pin is unavailable."
      );
    }
  }

  return reloadNewestStichtagPeriodPin;
});
