define(["./effectResultHelpers.js", "./readWidgetsFacet.js"], function (_helpers, _readWidgetsFacet) {
  "use strict";

  var TOPN_HELPER_PICK = ["display", "use", "d", "u", "value", "v", "label", "caption"];

  async function __controller(_deps, _context) {
    try {
      var service = _deps && _deps._KDB && _deps._KDB.services ? _deps._KDB.services.tableData : null;
      if (!service || typeof service.reloadTable !== "function") {
        return _helpers.failure("WIDGET_TOPN_UNAVAILABLE_DEPENDENCY", "tableData.reloadTable is unavailable.");
      }
      if (_helpers.isAborted(_context.signal)) {
        return _helpers.staleAborted();
      }
      await renderHelperBeforeRead(_deps._KDB, _context);
      if (_helpers.isAborted(_context.signal)) {
        return _helpers.staleAborted();
      }
      var rows = await service.reloadTable(buildInput(_context));
      if (_helpers.isAborted(_context.signal)) {
        return _helpers.staleAborted({ rows: rows });
      }
      return normalizeReadResult(rows, _context);
    } catch (err) {
      if (_helpers.isAbortError(err) || _helpers.isAborted(_context && _context.signal)) {
        return _helpers.staleAborted();
      }
      console.error("[widgetTopN.readHelperTableRows] failed", { ownerVisId: _context && _context.ownerVisId }, err);
      return _helpers.failure("WIDGET_TOPN_FLAT_DATA_FAILED", _helpers.messageFromError(err));
    }
  }

  function isAbortedOutcome(_outcome) {
    return !!(
      _outcome && (
        _outcome.outcome === "aborted" ||
        _outcome.aborted === true ||
        _outcome.reason === "aborted" ||
        _outcome.reason === "aborted-after-effect" ||
        _outcome.reason === "disposed"
      )
    );
  }

  async function renderHelperBeforeRead(_KDB, _context) {
    var widgetsFacet = _readWidgetsFacet(_KDB);
    var outcome;
    var abortErr;
    if (!widgetsFacet || typeof widgetsFacet.renderWidget !== "function") {
      throw new Error("cognosAPI.widgets.renderWidget is unavailable.");
    }
    outcome = await Promise.resolve(
      widgetsFacet.renderWidget(_context.helperWidgetId, { signal: _context.signal })
    );
    if (_helpers.isAborted(_context.signal) || isAbortedOutcome(outcome)) {
      abortErr = new Error("aborted");
      abortErr.name = "AbortError";
      throw abortErr;
    }
    if (!outcome || outcome.ok !== true) {
      throw new Error("cognosAPI.widgets.renderWidget is unavailable.");
    }
  }

  function buildInput(_context) {
    return [{
      widgetId: _context.helperWidgetId,
      role: "topNHelper",
      shape: "row",
      pick: TOPN_HELPER_PICK
    }];
  }

  function normalizeReadResult(rows, _context) {
    if (rows == null) {
      return _helpers.failure("WIDGET_TOPN_FLAT_DATA_TIMEOUT", "tableData returned no helper rows before timeout.", { rows: rows });
    }
    var normalizedRows = Array.isArray(rows) ? rows : [];
    var colKeys = readColumnKeys(normalizedRows);
    var diagnostics = {
      service: "tableData",
      operation: "reloadTable",
      targetWidgetId: _context.helperWidgetId,
      targetKind: "topNHelper",
      ownerWidgetId: _context.ownerVisId,
      opSeq: _context.opSeq,
      rowCount: normalizedRows.length,
      colKeys: colKeys
    };
    return {
      ok: true,
      status: "success",
      readResult: {
        status: "success",
        rows: normalizedRows,
        diagnostics: diagnostics,
        raw: { colKeys: colKeys, source: "tableData.reloadTable", pick: TOPN_HELPER_PICK.slice() }
      },
      diagnostics: diagnostics
    };
  }

  function readColumnKeys(rows) {
    if (!rows || !rows.length || !rows[0] || typeof rows[0] !== "object" || Object.prototype.toString.call(rows[0]) === "[object Array]") {
      return [];
    }
    return Object.keys(rows[0]);
  }

  return __controller;
});
