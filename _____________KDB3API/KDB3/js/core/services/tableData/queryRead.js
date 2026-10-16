define([
  "../../utils/kit/async.js",
  "./config.js",
], function (_async, _config) {
  "use strict";

  const ABORTED = Object.freeze({ status: "aborted", result: null });

  function isAbortSignal(signal) {
    return !!(signal && signal.aborted === true);
  }

  function isAbortError(error) {
    return !!error && (error.name === "AbortError" || error.code === "ABORT_ERR");
  }

  function failed(error) {
    return { status: "failed", result: null, error: error };
  }

  async function readTableQueryResult(_KDB, widgetId, options) {
    const signal = (options && options.signal) || null;
    try {
      if (!widgetId || isAbortSignal(signal)) {
        return { status: isAbortSignal(signal) ? "aborted" : "empty", result: null };
      }
      const facet = _KDB.runtime.tableData.dataQueryFacet;
      if (!facet || typeof facet.readQueryRows !== "function") {
        return failed(new Error("dataQueryFacet missing"));
      }
      const outcome = await facet.readQueryRows(widgetId, {
        budgetMs: _config.READ_BUDGET_MS,
        intervalMs: _config.POLL_INTERVAL_MS,
        signal: signal,
      });
      if (isAbortSignal(signal) || (outcome && outcome.outcome === "aborted")) {
        return ABORTED;
      }
      if (!outcome || outcome.ok !== true) {
        return failed(new Error(outcome && outcome.errorCode ? outcome.errorCode : "DATAQUERY_READ_FAILED"));
      }
      return { status: "ready", result: outcome.data || null };
    } catch (error) {
      return isAbortError(error) || isAbortSignal(signal) ? ABORTED : failed(error);
    }
  }

  function readParkFilter(_KDB, input) {
    const tableKey = input.tableHandle || input.tableName;
    const tables = _KDB.config && _KDB.config.tables;
    const park = tableKey && tables && tables[tableKey] && tables[tableKey].parkFilter;
    if (!park || typeof park.itemId !== "string" || !park.itemId || !park.body || typeof park.body !== "object") {
      return null;
    }
    return { itemId: park.itemId, body: park.body };
  }

  // A newer load of the same table owns the widget now and re-parks it itself.
  function shouldRestorePark(_KDB, tableKey, signal) {
    const current = tableKey ? _KDB.runtime.tableData.abortControllers[tableKey] : null;
    return !tableKey || !current || current.signal === signal;
  }

  function isParkListedEmpty(readResult) {
    return !!readResult && readResult.status === "ready" && (!readResult.result || readResult.result.rowCount === 0);
  }

  async function tryRemoveParkFilter(vis, widgetId, itemId, signal) {
    const ids = [itemId, itemId + "_none", itemId + "_1"];
    try {
      if (!vis || typeof vis.removeLocalFilter !== "function") {
        return;
      }
      for (let index = 0; index < ids.length; index += 1) {
        if (isAbortSignal(signal)) {
          return;
        }
        await vis.removeLocalFilter(widgetId, { itemId: ids[index] }, { signal: signal });
      }
    } catch (_error) {
      // Intentionally ignored: a park filter variant that does not exist on the widget may throw on removal.
    }
  }

  async function restoreParkFilter(vis, widgetId, park) {
    try {
      if (!vis || typeof vis.addOrReplaceLocalFilter !== "function") {
        return;
      }
      const outcome = await vis.addOrReplaceLocalFilter(widgetId, park.itemId, park.body);
      if (outcome && outcome.ok !== true && outcome.reason === "disposed") {
        return;
      }
      if (!outcome || outcome.ok !== true) {
        console.error("[tableDataService.readParkedTableQueryResult] repark failed", outcome);
      }
    } catch (error) {
      console.error("[tableDataService.readParkedTableQueryResult] repark failed", error);
    }
  }

  async function restoreParkRender(widgets, widgetId) {
    try {
      if (!widgets || typeof widgets.renderWidget !== "function") {
        return;
      }
      const outcome = await widgets.renderWidget(widgetId);
      if (outcome && outcome.ok !== true) {
        console.error("[tableDataService.readParkedTableQueryResult] repark render failed", outcome);
      }
    } catch (error) {
      console.error("[tableDataService.readParkedTableQueryResult] repark render failed", error);
    }
  }

  async function readUntilParkRows(_KDB, widgetId, signal) {
    const outcome = await _async.pollUntil({
      check: function () {
        return readTableQueryResult(_KDB, widgetId, { signal: signal });
      },
      predicate: function (readResult) {
        return !isParkListedEmpty(readResult);
      },
      timeoutMs: _config.READ_BUDGET_MS,
      intervalMs: _config.POLL_INTERVAL_MS,
      signal: signal,
    });
    if (outcome.ok) {
      return outcome.value;
    }
    return outcome.reason === "aborted" ? ABORTED : failed(new Error(_config.PARK_EMPTY_CODE));
  }

  async function removeParkAndRead(_KDB, widgetId, park, signal) {
    const widgets = _KDB.runtime.tableData.widgetsFacet;
    await tryRemoveParkFilter(_KDB.runtime.tableData.visualizationFacet, widgetId, park.itemId, signal);
    if (isAbortSignal(signal)) {
      return ABORTED;
    }
    if (!widgets || typeof widgets.renderWidget !== "function") {
      return failed(new Error("widgetsFacet.renderWidget missing"));
    }
    const renderOutcome = await widgets.renderWidget(widgetId, { signal: signal });
    if (isAbortSignal(signal)) {
      return ABORTED;
    }
    if (!renderOutcome || renderOutcome.ok !== true) {
      return failed(new Error(renderOutcome && renderOutcome.errorCode ? renderOutcome.errorCode : "WIDGET_RENDER_FAILED"));
    }
    return readUntilParkRows(_KDB, widgetId, signal);
  }

  async function restorePark(_KDB, widgetId, park, tableKey, signal) {
    if (!shouldRestorePark(_KDB, tableKey, signal)) {
      return;
    }
    await restoreParkFilter(_KDB.runtime.tableData.visualizationFacet, widgetId, park);
    if (shouldRestorePark(_KDB, tableKey, signal)) {
      await restoreParkRender(_KDB.runtime.tableData.widgetsFacet, widgetId);
    }
  }

  // Tables with a configured parkFilter keep a filter on their widget while idle: lift it, render, read, re-park.
  async function readParkedTableQueryResult(_KDB, widgetId, _input, signal) {
    const input = _input || {};
    try {
      const park = widgetId && !isAbortSignal(signal) ? readParkFilter(_KDB, input) : null;
      if (!park) {
        return await readTableQueryResult(_KDB, widgetId, { signal: signal });
      }
      try {
        return await removeParkAndRead(_KDB, widgetId, park, signal);
      } finally {
        await restorePark(_KDB, widgetId, park, input.tableHandle || input.tableName, signal);
      }
    } catch (error) {
      return isAbortError(error) || isAbortSignal(signal) ? ABORTED : failed(error);
    }
  }

  return { readParkedTableQueryResult: readParkedTableQueryResult };
});
