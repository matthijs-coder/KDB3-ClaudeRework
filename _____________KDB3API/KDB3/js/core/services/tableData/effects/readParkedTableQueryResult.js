define([
  "./readVisualizationFacet.js",
  "./readWidgetsFacet.js",
  "./readTableQueryResult.js"
], function (_readVisualizationFacet, _readWidgetsFacet, _readTableQueryResult) {
  "use strict";

  async function readParkedTableQueryResult(_KDB, _widgetId, _input, _signal) {
    var input = _input || {};
    var park;
    var vis;
    var widgets;
    var tableKey;
    var renderOutcome;
    var readResult;
    var restorePark;
    try {
      if (!_widgetId || isAbortSignal(_signal)) {
        return _readTableQueryResult(_KDB, _widgetId, { signal: _signal });
      }
      park = readParkFilter(_KDB, input);
      if (!park) {
        return _readTableQueryResult(_KDB, _widgetId, { signal: _signal });
      }
      vis = _readVisualizationFacet(_KDB);
      widgets = _readWidgetsFacet(_KDB);
      tableKey = input.tableHandle || input.tableName;
      try {
        await tryRemoveParkFilter(vis, _widgetId, park.itemId, _signal);
        if (isAbortSignal(_signal)) { return { status: "aborted", result: null }; }
        if (!widgets || typeof widgets.renderWidget !== "function") {
          return { status: "failed", result: null, error: new Error("widgetsFacet.renderWidget missing") };
        }
        renderOutcome = await widgets.renderWidget(_widgetId, { signal: _signal });
        if (isAbortSignal(_signal)) { return { status: "aborted", result: null }; }
        if (!renderOutcome || renderOutcome.ok !== true) {
          return { status: "failed", result: null, error: new Error(renderOutcome && renderOutcome.errorCode ? renderOutcome.errorCode : "WIDGET_RENDER_FAILED") };
        }
        readResult = await readUntilParkRows(_KDB, _widgetId, _signal);
        return readResult;
      } finally {
        restorePark = !!(park && _widgetId && shouldRestorePark(_KDB, tableKey, _signal));
        if (restorePark) {
          await restoreParkFilter(vis, _widgetId, park);
          if (shouldRestorePark(_KDB, tableKey, _signal)) {
            await restoreParkRender(widgets, _widgetId);
          }
        }
      }
    } catch (error) {
      if ((error && (error.name === "AbortError" || error.code === "ABORT_ERR")) || isAbortSignal(_signal)) {
        return { status: "aborted", result: null };
      }
      console.error("[tableDataService.readParkedTableQueryResult] query read failed", error);
      return { status: "failed", result: null, error: error };
    }
  }
  function readParkFilter(_KDB, _input) {
    var tableKey = _input && (_input.tableHandle || _input.tableName);
    var park = tableKey && _KDB && _KDB.config && _KDB.config.tables && _KDB.config.tables[tableKey] && _KDB.config.tables[tableKey].parkFilter;
    if (!park || typeof park.itemId !== "string" || !park.itemId || !park.body || typeof park.body !== "object") { return null; }
    return { itemId: park.itemId, body: park.body };
  }
  function isAbortSignal(_signal) {
    return !!(_signal && _signal.aborted === true);
  }
  function shouldRestorePark(_KDB, _tableKey, _signal) {
    var controllers = _KDB && _KDB.runtime && _KDB.runtime.tableData && _KDB.runtime.tableData.abortControllers;
    var current = _tableKey && controllers ? controllers[_tableKey] : null;
    return !_tableKey || !current || current.signal === _signal;
  }
  function isParkListedEmpty(_readResult) {
    return _readResult && _readResult.status === "ready" && (!_readResult.result || _readResult.result.rowCount === 0);
  }
  async function tryRemoveParkFilter(_vis, _widgetId, _itemId, _signal) {
    var ids = [_itemId, _itemId + "_none", _itemId + "_1"];
    var i;
    try {
      if (!_vis || typeof _vis.removeLocalFilter !== "function") { return; }
      for (i = 0; i < ids.length; i += 1) {
        if (isAbortSignal(_signal)) { return; }
        await _vis.removeLocalFilter(_widgetId, { itemId: ids[i] }, { signal: _signal });
      }
    } catch (_error) {}
  }
  async function restoreParkFilter(_vis, _widgetId, _park) {
    var outcome;
    try {
      if (!_vis || typeof _vis.addOrReplaceLocalFilter !== "function") { return; }
      outcome = await _vis.addOrReplaceLocalFilter(_widgetId, _park.itemId, _park.body);
      if (outcome && outcome.ok !== true && outcome.reason === "disposed") { return; }
      if (!outcome || outcome.ok !== true) {
        console.error("[tableDataService.readParkedTableQueryResult] repark failed", outcome);
      }
    } catch (error) {
      console.error("[tableDataService.readParkedTableQueryResult] repark failed", error);
    }
  }
  async function restoreParkRender(_widgets, _widgetId) {
    var outcome;
    try {
      if (!_widgets || typeof _widgets.renderWidget !== "function") { return; }
      outcome = await _widgets.renderWidget(_widgetId);
      if (outcome && outcome.ok !== true) { console.error("[tableDataService.readParkedTableQueryResult] repark render failed", outcome); }
    } catch (error) { console.error("[tableDataService.readParkedTableQueryResult] repark render failed", error); }
  }
  function finishParkPollWait(_timer) {
    if (!_timer || _timer.done) { return; }
    _timer.done = true;
    clearTimeout(_timer.id);
    if (_timer.signal && _timer.finish && typeof _timer.signal.removeEventListener === "function") {
      _timer.signal.removeEventListener("abort", _timer.finish);
    }
    _timer.resolve();
  }
  function waitParkPollInterval(_ms, _signal) {
    return new Promise(function (_resolve) {
      var timer;
      if (isAbortSignal(_signal)) { _resolve(); return; }
      timer = { id: 0, done: false, signal: _signal, resolve: _resolve, finish: null };
      timer.finish = finishParkPollWait.bind(null, timer);
      timer.id = setTimeout(timer.finish, _ms);
      if (_signal && typeof _signal.addEventListener === "function") { _signal.addEventListener("abort", timer.finish); }
    });
  }
  async function readUntilParkRows(_KDB, _widgetId, _signal) {
    var deadline = Date.now() + 60000;
    var readResult;
    try {
      while (true) {
        if (isAbortSignal(_signal)) { return { status: "aborted", result: null }; }
        readResult = await _readTableQueryResult(_KDB, _widgetId, { signal: _signal });
        if (isAbortSignal(_signal)) { return { status: "aborted", result: null }; }
        if (!isParkListedEmpty(readResult)) { return readResult; }
        if (Date.now() >= deadline) { return { status: "failed", result: null, error: new Error("TABLE_DATA_PARK_EMPTY") }; }
        await waitParkPollInterval(100, _signal);
      }
    } catch (error) {
      if ((error && (error.name === "AbortError" || error.code === "ABORT_ERR")) || isAbortSignal(_signal)) {
        return { status: "aborted", result: null };
      }
      throw error;
    }
  }

  return readParkedTableQueryResult;
});
