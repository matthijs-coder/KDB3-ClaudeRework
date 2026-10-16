define([], function () {
  "use strict";

  var PDF_WIDGET_RENDER_TIMEOUT_MS = 12000;

  function isTraverseSuccess(_result) {
    if (_result === true) return true;
    if (!_result || typeof _result !== "object") return false;
    if (_result.ok === true) return true;
    if (_result.success === true) return true;
    return false;
  }

  function failedRestore(_message, _details) {
    var warning = {
      code: "DASHBOARD_PDF_RESTORE_FAILED",
      message: _message,
      details: _details || null
    };
    console.warn("[dashboardPdf.restoreOriginalTab]", warning);
    return { ok: false, warning: warning };
  }

  async function restoreOriginalTab(_KDB, _index, _timeoutMs) {
    var traverseResult;
    var state;
    var tab;
    var renderResult;
    if (typeof _index !== "number") return { ok: true, skipped: true };
    try {
      traverseResult = await _KDB.api.tabs.dispatch({
        type: "tabs/traverse",
        payload: {
          source: "dashboardPdfRestore", scope: "singleTab", tabIndex: _index,
          restoreActiveTab: false, waitFor: "canvas", timeoutMs: _timeoutMs
        }
      });
      if (!isTraverseSuccess(traverseResult)) {
        return failedRestore("Original tab activation failed after PDF save.", { tabIndex: _index, result: traverseResult });
      }
      state = _KDB.api.tabs && _KDB.api.tabs.getState ? _KDB.api.tabs.getState() : null;
      tab = state && state.byIndex ? state.byIndex[String(_index)] : null;
      if (!tab || !tab.tabId) {
        return failedRestore("Original tab identity was unavailable after activation.", { tabIndex: _index });
      }
      renderResult = await _KDB.api.widgetBase.dispatch({
        type: "widgetBase/renderTabWidgetsRequested",
        payload: { tabId: tab.tabId, reason: "dashboardPdfRestore", timeoutMs: PDF_WIDGET_RENDER_TIMEOUT_MS }
      });
      if (!renderResult || renderResult.ok !== true || Number(renderResult.failed) > 0) {
        return failedRestore("Original tab widget render failed after PDF save.", { tabIndex: _index, result: renderResult });
      }
      return { ok: true };
    } catch (error) {
      return failedRestore("Original tab restore threw after PDF save.", {
        tabIndex: _index,
        error: String(error && error.message ? error.message : error)
      });
    }
  }

  return restoreOriginalTab;
});
