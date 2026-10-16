define([
  "../../../../core/config/visualizations/topNHelper.js",
  "./readWidgetsFacet.js"
], function (_topNHelperConfig, _readWidgetsFacet) {
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
      logStichtagReload("beforeRender", null, await tableData.reloadTable(input));
      tableState = tableData.readTableState([{ tableName: tableName }]);
      leftoverId = tableState && tableState.widgetId;
      if (!leftoverId) {
        return rejectStichtagUnavailable("NewestStichtag leftover widgetId is unavailable.");
      }
      widgetsFacet = _readWidgetsFacet(_KDB);
      if (!widgetsFacet || typeof widgetsFacet.renderWidget !== "function") {
        return rejectStichtagUnavailable("widgetsFacet.renderWidget is unavailable.");
      }
      outcome = await widgetsFacet.renderWidget(leftoverId);
      logStichtagRender(leftoverId, outcome);
      if (!outcome || outcome.ok !== true) {
        return rejectStichtagUnavailable("widgetsFacet.renderWidget is unavailable.");
      }
      var afterRender = await tableData.reloadTable(input);
      logStichtagReload("afterRender", leftoverId, afterRender);
      return afterRender;
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

  function logStichtagRender(leftoverId, outcome) {
    try {
      console.info("[sicht-jahr] TEMP NewestStichtag render", {
        leftoverId: leftoverId,
        ok: !!(outcome && outcome.ok === true),
        outcome: outcome && outcome.outcome,
        reason: outcome && outcome.reason
      });
    } catch (err) {
      console.info("[sicht-jahr] TEMP NewestStichtag render log failed", err);
    }
  }

  function logStichtagReload(phase, leftoverId, rows) {
    try {
      var list = Array.isArray(rows) ? rows : [];
      console.info("[sicht-jahr] TEMP NewestStichtag reload", {
        phase: phase,
        leftoverId: leftoverId,
        rowCount: list.length,
        firstRow: list.length ? list[0] : null
      });
    } catch (err) {
      console.info("[widgetVis.NewestStichtag] TEMP reload failed", err);
    }
  }

  return reloadNewestStichtagPeriodPin;
});
