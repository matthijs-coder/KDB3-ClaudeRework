define([
  "../../core/utils/kit/errors.js",
  "./config.js"
], function (_errors, _config) {
  "use strict";

  var CODES = _config.CODES;
  var FOCUS_STATE_UNAVAILABLE = "DASHBOARD_PDF_FOCUS_STATE_UNAVAILABLE";

  // ---- visible tabs manifest ------------------------------------------------------------------------------

  function readVisibleTabsManifest(_KDB, labels) {
    var api = _KDB.api && _KDB.api.tabs;
    var state = api && typeof api.getState === "function" ? api.getState() : null;
    if (!state || !Array.isArray(state.visibleTabs)) {
      return {
        activeIndex: null,
        tabs: [],
        errorCode: "DASHBOARD_PDF_VISIBLE_TABS_UNAVAILABLE",
        errorMessage: "tabs.getState() did not provide the canonical visibleTabs projection."
      };
    }
    return {
      activeIndex: typeof state.activeIndex === "number" ? state.activeIndex : null,
      tabs: state.visibleTabs.map(function (tab) {
        return {
          index: tab.index,
          tabId: tab.tabId || null,
          pageId: tab.pageId || null,
          name: tab.name || labels.unnamedTab
        };
      })
    };
  }

  // ---- traverse + render (shared by capture and restore) -------------------------------------------------

  function dispatchTabTraverse(_KDB, source, tabIndex, timeoutMs) {
    return _KDB.api.tabs.dispatch({
      type: "tabs/traverse",
      payload: { source: source, scope: "singleTab", tabIndex: tabIndex, restoreActiveTab: false, waitFor: "canvas", timeoutMs: timeoutMs }
    });
  }

  async function renderTabWidgets(_KDB, tabId, reason) {
    var result = await _KDB.api.widgetBase.dispatch({
      type: "widgetBase/renderTabWidgetsRequested",
      payload: { tabId: tabId, reason: reason, timeoutMs: _config.PDF_WIDGET_RENDER_TIMEOUT_MS }
    });
    return { ok: !!result && result.ok === true && !(Number(result.failed) > 0), result: result };
  }

  /**
   * Activates a tab and waits until its widgets are rendered.
   * @throws {Error} coded TAB_GATE_TIMEOUT / TAB_GATE_FAILED / TAB_RENDER_FAILED
   */
  async function activateTabForCapture(_KDB, tab, timeoutMs) {
    var traversed = await dispatchTabTraverse(_KDB, "dashboardPdf", tab.index, timeoutMs);
    if (!traversed) {
      var tabsState = _KDB.api.tabs.getState ? _KDB.api.tabs.getState() : null;
      var traversal = tabsState && tabsState.traversal ? tabsState.traversal : {};
      var code = traversal.errorCode === "TABS_TRAVERSE_TIMEOUT" ? CODES.TAB_GATE_TIMEOUT : CODES.TAB_GATE_FAILED;
      throw _errors.codedError(code, traversal.errorMessage || "Tab activation gate failed.");
    }
    var rendered = await renderTabWidgets(_KDB, tab.tabId, "dashboardPdf");
    if (!rendered.ok) {
      throw _errors.codedError(CODES.TAB_RENDER_FAILED, "Widget render gate failed.");
    }
  }

  function isTraverseSuccess(result) {
    if (result === true) return true;
    return !!result && typeof result === "object" && (result.ok === true || result.success === true);
  }

  function failRestore(message, details) {
    var warning = { code: "DASHBOARD_PDF_RESTORE_FAILED", message: message, details: details || null };
    console.warn("[dashboardPdf.restoreOriginalTab]", warning);
    return { ok: false, warning: warning };
  }

  /**
   * Re-activates the tab that was active before the export. Runs in the export's `finally`, so it reports
   * failures as { ok: false, warning } instead of throwing.
   */
  async function restoreOriginalTab(_KDB, index, timeoutMs) {
    if (typeof index !== "number") return { ok: true, skipped: true };
    try {
      var traverseResult = await dispatchTabTraverse(_KDB, "dashboardPdfRestore", index, timeoutMs);
      if (!isTraverseSuccess(traverseResult)) {
        return failRestore("Original tab activation failed after PDF save.", { tabIndex: index, result: traverseResult });
      }
      var state = _KDB.api.tabs.getState ? _KDB.api.tabs.getState() : null;
      var tab = state && state.byIndex ? state.byIndex[String(index)] : null;
      if (!tab || !tab.tabId) {
        return failRestore("Original tab identity was unavailable after activation.", { tabIndex: index });
      }
      var rendered = await renderTabWidgets(_KDB, tab.tabId, "dashboardPdfRestore");
      if (!rendered.ok) {
        return failRestore("Original tab widget render failed after PDF save.", { tabIndex: index, result: rendered.result });
      }
      return { ok: true };
    } catch (error) {
      return failRestore("Original tab restore threw after PDF save.", {
        tabIndex: index,
        error: String(error && error.message ? error.message : error)
      });
    }
  }

  // ---- focus mode (maximized widgets) ----------------------------------------------------------------------

  function createFocusWarning(code, message, details) {
    return { code: code, message: message, details: details == null ? null : details };
  }

  function readWidgetVisApi(_KDB) {
    return _KDB.api && _KDB.api.widgetVis ? _KDB.api.widgetVis : null;
  }

  function readMaximizedWidgetIds(_KDB) {
    var stateUnavailable = function (details) {
      return { ok: true, widgetIds: [], warning: createFocusWarning(FOCUS_STATE_UNAVAILABLE, "widgetVis focus state could not be read.", details) };
    };
    try {
      var api = readWidgetVisApi(_KDB);
      var state = api && typeof api.getState === "function" ? api.getState() : null;
      if (state === undefined || state === null) return stateUnavailable(null);
      if (!state.byId || typeof state.byId !== "object") return { ok: true, widgetIds: [], skipped: true };
      var widgetIds = Object.keys(state.byId).filter(function (key) {
        return !!state.byId[key] && state.byId[key].maximized === true;
      });
      return { ok: true, widgetIds: widgetIds, skipped: widgetIds.length === 0 };
    } catch (error) {
      console.error("[dashboardPdf.readMaximizedWidgetIds] failed", error);
      return stateUnavailable({ error: String(error && error.message ? error.message : error) });
    }
  }

  async function dispatchMaximizeToggle(_KDB, widgetId, nextMaximized) {
    try {
      var api = readWidgetVisApi(_KDB);
      if (!api || typeof api.dispatch !== "function") {
        return { ok: false, widgetId: widgetId, errorCode: FOCUS_STATE_UNAVAILABLE, errorMessage: "widgetVis.dispatch is unavailable." };
      }
      var result = await api.dispatch({
        type: "widgetVis/maximizeToggle",
        widgetId: widgetId,
        payload: { nextMaximized: nextMaximized === true, source: "programmatic" }
      });
      if (result && typeof result === "object" && result.ok === true) {
        return { ok: true, widgetId: widgetId, result: result };
      }
      return {
        ok: false,
        widgetId: widgetId,
        errorCode: result && result.errorCode ? result.errorCode : "WIDGET_VIS_MAXIMIZE_FAILED",
        errorMessage: result && result.errorMessage ? String(result.errorMessage) : "Focus mode toggle failed."
      };
    } catch (error) {
      console.error("[dashboardPdf.dispatchMaximizeToggle] failed", widgetId, error);
      return { ok: false, widgetId: widgetId, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED", errorMessage: String(error && error.message ? error.message : error) };
    }
  }

  /** Un-maximizes all focused widgets so the capture shows the full dashboard. Never throws. */
  async function exitFocusModeForExport(_KDB) {
    var snapshot = readMaximizedWidgetIds(_KDB);
    if (snapshot.warning) return { ok: true, widgetIds: [], warning: snapshot.warning };
    if (snapshot.widgetIds.length === 0) return { ok: true, widgetIds: [], skipped: true };
    var exited = [];
    for (var idx = 0; idx < snapshot.widgetIds.length; idx += 1) {
      var id = snapshot.widgetIds[idx];
      var toggle = await dispatchMaximizeToggle(_KDB, id, false);
      if (toggle.ok !== true) {
        console.warn("[dashboardPdf.exitFocusModeForExport]", toggle);
        return {
          ok: false,
          errorCode: CODES.FOCUS_EXIT_FAILED,
          errorMessage: toggle.errorMessage || "Focus mode exit failed.",
          widgetIds: exited,
          failedWidgetId: id
        };
      }
      exited.push(id);
    }
    return { ok: true, widgetIds: exited };
  }

  /** Re-maximizes the widgets exited before the export. Runs in `finally`; failures are returned as a warning. */
  async function restoreFocusModeForExport(_KDB, widgetIds) {
    if (!Array.isArray(widgetIds) || widgetIds.length === 0) return { ok: true, skipped: true };
    var failed = [];
    for (var idx = 0; idx < widgetIds.length; idx += 1) {
      var toggle = await dispatchMaximizeToggle(_KDB, widgetIds[idx], true);
      if (toggle.ok !== true) {
        failed.push({ widgetId: widgetIds[idx], errorCode: toggle.errorCode, errorMessage: toggle.errorMessage });
      }
    }
    if (failed.length === 0) return { ok: true };
    var warning = createFocusWarning("DASHBOARD_PDF_FOCUS_RESTORE_FAILED", "Focus mode restore failed after PDF export.", { failed: failed });
    console.warn("[dashboardPdf.restoreFocusModeForExport]", warning);
    return { ok: false, warning: warning };
  }

  return {
    readVisibleTabsManifest: readVisibleTabsManifest,
    activateTabForCapture: activateTabForCapture,
    restoreOriginalTab: restoreOriginalTab,
    exitFocusModeForExport: exitFocusModeForExport,
    restoreFocusModeForExport: restoreFocusModeForExport
  };
});
