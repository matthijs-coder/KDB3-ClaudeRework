define([
  "./formatUpdateDate.js",
  "./readUpdateDateFromRows.js"
], function (_formatUpdateDate, _readUpdateDateFromRows) {
  "use strict";
  function tableInput() {
    return [{ tableName: "update_date", shape: "row", isCoreTable: true }];
  }
  function dispatchApplyUpdateDate(_KDB, raw, formatted) {
    try {
      var api = _KDB && _KDB.api && _KDB.api.footer;
      if (!api || typeof api.dispatch !== "function") return;
      api.dispatch({
        type: "footer/applyUpdateDate",
        payload: { source: "bootstrap", raw: raw, formatted: formatted || "n.v." }
      });
    } catch (err) {
      console.error("[footer.dispatchApplyUpdateDate]", err);
    }
  }
  function logLoadFooterUpdateDateError(err) {
    if (err && err.name === "AbortError") return;
    console.error("[footer.loadFooterUpdateDate]", err);
  }
  async function runUpdateDateLoadWork(_KDB, _signal) {
    try {
      var tableData = _KDB && _KDB.services && _KDB.services.tableData;
      if (!tableData || typeof tableData.waitForRows !== "function" || typeof tableData.readRows !== "function") {
        dispatchApplyUpdateDate(_KDB, null, "n.v.");
        return;
      }
      var waitedRows = await tableData.waitForRows(tableInput());
      if (_signal && _signal.aborted) return;
      var rows = tableData.readRows(tableInput());
      if (rows === undefined) rows = waitedRows;
      if (rows == null) return;
      var raw = _readUpdateDateFromRows(rows);
      var formatted = _formatUpdateDate(raw);
      if (_signal && _signal.aborted) return;
      dispatchApplyUpdateDate(_KDB, raw, formatted || "n.v.");
    } catch (err) {
      if (_signal && _signal.aborted) return;
      if (err && err.name === "AbortError") return;
      console.error("[footer.runUpdateDateLoadWork]", err);
      if (!(_signal && _signal.aborted)) dispatchApplyUpdateDate(_KDB, null, "n.v.");
    } finally {
      var acs = _KDB && _KDB.runtime && _KDB.runtime.footer && _KDB.runtime.footer.abortControllers;
      if (acs && acs.updateDate && acs.updateDate.signal === _signal) delete acs.updateDate;
    }
  }
  function abortFooterUpdateDate(_KDB) {
    try {
      var acs = _KDB && _KDB.runtime && _KDB.runtime.footer && _KDB.runtime.footer.abortControllers;
      var ac = acs && acs.updateDate;
      if (ac && typeof ac.abort === "function") ac.abort();
    } catch (err) {
      console.error("[footer.abortFooterUpdateDate]", err);
    }
  }
  function loadFooterUpdateDate(_KDB) {
    try {
      var rt = _KDB && _KDB.runtime && _KDB.runtime.footer;
      if (!rt) return;
      rt.abortControllers = rt.abortControllers || {};
      var existing = rt.abortControllers.updateDate;
      if (existing && !(existing.signal && existing.signal.aborted)) return;
      var controller = new AbortController();
      rt.abortControllers.updateDate = controller;
      runUpdateDateLoadWork(_KDB, controller.signal).catch(logLoadFooterUpdateDateError);
    } catch (err) {
      console.error("[footer.loadFooterUpdateDate]", err);
    }
  }
  return {
    loadFooterUpdateDate: loadFooterUpdateDate,
    abortFooterUpdateDate: abortFooterUpdateDate
  };
});
