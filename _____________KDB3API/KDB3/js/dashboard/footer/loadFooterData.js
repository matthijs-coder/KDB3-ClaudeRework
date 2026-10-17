define(["./config.js"], function (_config) {
  "use strict";

  var UPDATE_DATE_CELL_FIELDS = ["use", "u", "display", "d"];

  function formatUpdateDate(_rawValue) {
    if (_rawValue == null) return null;
    var text = String(_rawValue).trim();
    if (!text) return null;
    var german = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
    if (german) {
      return parseInt(german[1], 10) + "." + parseInt(german[2], 10) + "." + parseInt(german[3], 10);
    }
    var iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (iso) {
      return parseInt(iso[3], 10) + "." + parseInt(iso[2], 10) + "." + parseInt(iso[1], 10);
    }
    return null;
  }

  function readUpdateDateFromRows(_rows) {
    if (!Array.isArray(_rows) || !_rows[0]) return null;
    var row = _rows[0];
    var cell = Object.prototype.hasOwnProperty.call(row, "aktualisierungsDatum") ? row.aktualisierungsDatum : row[Object.keys(row)[0]];
    if (cell == null) return null;
    if (typeof cell !== "object") {
      return String(cell).trim() || null;
    }
    var index;
    for (index = 0; index < UPDATE_DATE_CELL_FIELDS.length; index += 1) {
      var value = cell[UPDATE_DATE_CELL_FIELDS[index]];
      var text = value == null ? "" : String(value).trim();
      if (text) return text;
    }
    return null;
  }

  function createUpdateDateTableInput() {
    return _config.UPDATE_DATE_TABLE_INPUT.map(function (entry) {
      return Object.assign({}, entry);
    });
  }

  function dispatchFooterAction(_KDB, _type, _payload) {
    var api = _KDB.api && _KDB.api.footer;
    if (!api) return;
    api.dispatch({ type: _type, payload: Object.assign({ source: "bootstrap" }, _payload) });
  }

  function applyUpdateDate(_KDB, _raw, _formatted) {
    dispatchFooterAction(_KDB, "footer/applyUpdateDate", { raw: _raw, formatted: _formatted || _config.LABELS.updateDateUnknown });
  }

  async function runUpdateDateLoad(_KDB, _signal) {
    try {
      var tableData = _KDB.services && _KDB.services.tableData;
      if (!tableData) {
        applyUpdateDate(_KDB, null, null);
        return;
      }
      var waitedRows = await tableData.waitForRows(createUpdateDateTableInput());
      if (_signal.aborted) return;
      var rows = tableData.readRows(createUpdateDateTableInput());
      if (rows === undefined) rows = waitedRows;
      if (rows == null) return;
      var raw = readUpdateDateFromRows(rows);
      applyUpdateDate(_KDB, raw, formatUpdateDate(raw));
    } catch (err) {
      if (_signal.aborted || (err && err.name === "AbortError")) return;
      console.error("[footer.loadFooterUpdateDate]", err);
      applyUpdateDate(_KDB, null, null);
    } finally {
      var controllers = _KDB.runtime.footer.abortControllers;
      if (controllers.updateDate && controllers.updateDate.signal === _signal) delete controllers.updateDate;
    }
  }

  function loadFooterUpdateDate(_KDB) {
    var controllers = _KDB.runtime.footer.abortControllers;
    var existing = controllers.updateDate;
    if (existing && !existing.signal.aborted) return;
    var controller = new AbortController();
    controllers.updateDate = controller;
    runUpdateDateLoad(_KDB, controller.signal);
  }

  function loadFooterCreatedUser(_KDB) {
    var current = _KDB.state.footer.createdUserName;
    if (typeof current === "string" && current) return;
    var facet = _KDB.runtime.footer.dashboardFacet;
    var userName = "";
    if (facet && typeof facet.getUserName === "function") {
      var outcome = facet.getUserName();
      userName = outcome && outcome.ok === true && typeof outcome.data === "string" ? outcome.data.trim() : "";
    }
    dispatchFooterAction(_KDB, "footer/applyCreatedUser", { userName: userName || null });
  }

  return {
    loadFooterUpdateDate: loadFooterUpdateDate,
    loadFooterCreatedUser: loadFooterCreatedUser
  };
});
