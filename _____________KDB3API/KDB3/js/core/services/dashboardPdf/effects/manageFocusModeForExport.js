define([], function () {
  "use strict";

  function createFocusWarning(_code, _message, _details) {
    return { code: _code, message: _message, details: _details == null ? null : _details };
  }

  function readWidgetVisApi(_KDB) {
    return _KDB && _KDB.api && _KDB.api.widgetVis ? _KDB.api.widgetVis : null;
  }

  function isDispatchSuccess(_result) {
    return !!(_result && typeof _result === "object" && _result.ok === true);
  }

  function readMaximizedWidgetIds(_KDB) {
    var api;
    var state;
    var byId;
    var widgetIds;
    var keys;
    var idx;
    var key;
    try {
      api = readWidgetVisApi(_KDB);
      if (!api || typeof api.getState !== "function") {
        return { ok: true, widgetIds: [], warning: createFocusWarning("DASHBOARD_PDF_FOCUS_STATE_UNAVAILABLE", "widgetVis focus state could not be read.", null) };
      }
      state = api.getState();
      if (state === undefined || state === null) {
        return { ok: true, widgetIds: [], warning: createFocusWarning("DASHBOARD_PDF_FOCUS_STATE_UNAVAILABLE", "widgetVis focus state could not be read.", null) };
      }
      byId = state.byId;
      if (!byId || typeof byId !== "object") {
        return { ok: true, widgetIds: [], skipped: true };
      }
      widgetIds = [];
      keys = Object.keys(byId);
      for (idx = 0; idx < keys.length; idx += 1) {
        key = keys[idx];
        if (byId[key] && byId[key].maximized === true) {
          widgetIds.push(key);
        }
      }
      return { ok: true, widgetIds: widgetIds, skipped: widgetIds.length === 0 };
    } catch (err) {
      console.error("[dashboardPdf.readMaximizedWidgetIds] failed", err);
      return { ok: true, widgetIds: [], warning: createFocusWarning("DASHBOARD_PDF_FOCUS_STATE_UNAVAILABLE", "widgetVis focus state could not be read.", { error: String(err && err.message ? err.message : err) }) };
    }
  }

  async function dispatchMaximizeToggle(_KDB, _widgetId, _nextMaximized) {
    var api;
    var result;
    try {
      api = readWidgetVisApi(_KDB);
      if (!api || typeof api.dispatch !== "function") {
        return { ok: false, widgetId: _widgetId, errorCode: "DASHBOARD_PDF_FOCUS_STATE_UNAVAILABLE", errorMessage: "widgetVis.dispatch is unavailable." };
      }
      result = await api.dispatch({
        type: "widgetVis/maximizeToggle",
        widgetId: _widgetId,
        payload: { nextMaximized: _nextMaximized === true, source: "programmatic" }
      });
      if (isDispatchSuccess(result)) {
        return { ok: true, widgetId: _widgetId, result: result };
      }
      return {
        ok: false,
        widgetId: _widgetId,
        errorCode: result && result.errorCode ? result.errorCode : "WIDGET_VIS_MAXIMIZE_FAILED",
        errorMessage: result && result.errorMessage ? String(result.errorMessage) : "Focus mode toggle failed."
      };
    } catch (err) {
      console.error("[dashboardPdf.dispatchMaximizeToggle] failed", _widgetId, err);
      return { ok: false, widgetId: _widgetId, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  async function exitFocusModeForExport(_KDB) {
    var snapshot;
    var exited = [];
    var idx;
    var id;
    var toggle;
    try {
      snapshot = readMaximizedWidgetIds(_KDB);
      if (snapshot.warning) {
        return { ok: true, widgetIds: [], warning: snapshot.warning };
      }
      if (!snapshot.widgetIds || snapshot.widgetIds.length === 0) {
        return { ok: true, widgetIds: [], skipped: true };
      }
      for (idx = 0; idx < snapshot.widgetIds.length; idx += 1) {
        id = snapshot.widgetIds[idx];
        toggle = await dispatchMaximizeToggle(_KDB, id, false);
        if (toggle.ok !== true) {
          console.warn("[dashboardPdf.exitFocusModeForExport]", toggle);
          return { ok: false, errorCode: "DASHBOARD_PDF_FOCUS_EXIT_FAILED", errorMessage: toggle.errorMessage || "Focus mode exit failed.", widgetIds: exited, failedWidgetId: id };
        }
        exited.push(id);
      }
      return { ok: true, widgetIds: exited };
    } catch (err) {
      console.error("[dashboardPdf.exitFocusModeForExport] failed", err);
      return { ok: false, errorCode: "DASHBOARD_PDF_FOCUS_EXIT_FAILED", errorMessage: String(err && err.message ? err.message : err), widgetIds: exited };
    }
  }

  async function restoreFocusModeForExport(_KDB, _widgetIds) {
    var failed;
    var idx;
    var id;
    var toggle;
    var warning;
    try {
      if (!Array.isArray(_widgetIds) || _widgetIds.length === 0) {
        return { ok: true, skipped: true };
      }
      failed = [];
      for (idx = 0; idx < _widgetIds.length; idx += 1) {
        id = _widgetIds[idx];
        toggle = await dispatchMaximizeToggle(_KDB, id, true);
        if (toggle.ok !== true) {
          failed.push({ widgetId: id, errorCode: toggle.errorCode, errorMessage: toggle.errorMessage });
        }
      }
      if (failed.length === 0) {
        return { ok: true };
      }
      warning = createFocusWarning("DASHBOARD_PDF_FOCUS_RESTORE_FAILED", "Focus mode restore failed after PDF export.", { failed: failed });
      console.warn("[dashboardPdf.restoreFocusModeForExport]", warning);
      return { ok: false, warning: warning };
    } catch (err) {
      console.error("[dashboardPdf.restoreFocusModeForExport] failed", err);
      return { ok: false, warning: createFocusWarning("DASHBOARD_PDF_FOCUS_RESTORE_FAILED", "Focus mode restore threw after PDF export.", { error: String(err && err.message ? err.message : err) }) };
    }
  }

  return {
    exitFocusModeForExport: exitFocusModeForExport,
    restoreFocusModeForExport: restoreFocusModeForExport
  };
});
