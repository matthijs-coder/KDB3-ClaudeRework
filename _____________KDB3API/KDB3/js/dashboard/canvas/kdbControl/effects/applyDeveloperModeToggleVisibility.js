define([
  "../../../../core/utils/isRightAllowed.js",
  "../../../../core/utils/readFirstRowScalar.js",
], function (_isRightAllowed, _readFirstRowScalar) {
  "use strict";

  function isAbortError(err) {
    return !!(err && (err.name === "AbortError" || err.code === "ABORT_ERR"));
  }

  function onFail(err) {
    if (isAbortError(err)) return;
    console.error("[kdbControl.applyDeveloperModeToggleVisibility]", err);
  }

  function unhideIfAllowed(_KDB, _ac, _rows) {
    try {
      if (!_ac || _ac.signal.aborted) return;
      if (!Array.isArray(_rows)) return;
      if (!_isRightAllowed(_readFirstRowScalar(_rows))) return;
      var rt = _KDB && _KDB.runtime && _KDB.runtime.kdbControl;
      if (!rt) return;
      var root = (rt.domRefs && rt.domRefs.rootEl) || document;
      var col = root.querySelector(".kdb-control_dashboard-toggles-column--developer-mode-gated");
      if (col) col.classList.add("kdb-control_dashboard-toggles-column--developer-mode-visible");
    } catch (err) {
      console.error("[kdbControl.applyDeveloperModeToggleVisibility]", err);
    }
  }

  function onRows(_KDB, _ac, _tableData, _input, _waited) {
    try {
      if (!_ac || _ac.signal.aborted) return;
      var fromRead = _tableData && typeof _tableData.readRows === "function" ? _tableData.readRows(_input) : null;
      var rows = Array.isArray(fromRead) ? fromRead : _waited;
      unhideIfAllowed(_KDB, _ac, rows);
    } catch (err) {
      console.error("[kdbControl.applyDeveloperModeToggleVisibility]", err);
    }
  }

  function applyDeveloperModeToggleVisibility(_KDB) {
    try {
      var rt = _KDB && _KDB.runtime && _KDB.runtime.kdbControl;
      if (!rt) return;
      var prev = rt.abortControllers && rt.abortControllers.developerModeToggleVisibility;
      if (prev && typeof prev.abort === "function") prev.abort();
      var ac = new AbortController();
      rt.abortControllers = rt.abortControllers || {};
      rt.abortControllers.developerModeToggleVisibility = ac;
      var tableData = _KDB.services && _KDB.services.tableData;
      if (!tableData || typeof tableData.waitForRows !== "function") return;
      var input = [{ tableName: "superuser", isCoreTable: true }];
      return tableData.waitForRows(input).then(onRows.bind(null, _KDB, ac, tableData, input), onFail);
    } catch (err) {
      console.error("[kdbControl.applyDeveloperModeToggleVisibility]", err);
    }
  }

  return applyDeveloperModeToggleVisibility;
});
