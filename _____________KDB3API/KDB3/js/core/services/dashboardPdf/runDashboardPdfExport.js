define([
  "./effects/readVisibleTabsManifest.js",
  "./effects/buildAttachmentRows.js",
  "./effects/renderAttachmentPages.js",
  "./effects/captureTabPage.js",
  "./effects/renderDashboardPages.js",
  "./effects/restoreOriginalTab.js",
  "./effects/manageFocusModeForExport.js"
], function (_readVisibleTabsManifest, _buildAttachmentRows, _renderAttachmentPages, _captureTabPage, _renderDashboardPages, _restoreOriginalTab, _manageFocusModeForExport) {
  "use strict";

  var TITLE_FALLBACK = "konfigurierbares Personaldashboard";

  function report(_onProgress, _payload) {
    if (typeof _onProgress === "function") {
      try {
        _onProgress(_payload);
      } catch (_err) {
        console.warn("[dashboardPdf.export][onProgressFailed]", _err);
      }
    }
  }

  function abortedResult(_warnings, _startedAt) {
    return {
      ok: false,
      errorCode: "DASHBOARD_PDF_ABORTED",
      errorMessage: "Export aborted.",
      warnings: _warnings,
      elapsedMs: Date.now() - _startedAt
    };
  }

  function isAborted(_signal) { return !!(_signal && _signal.aborted); }

  function readDashboardFacet(_KDB) {
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime.dashboardPdf : null;
    return runtime && runtime.dashboardFacet ? runtime.dashboardFacet : null;
  }

  function readOutcomeFailureMessage(_outcome, _fallback) {
    var diagnostics = _outcome && _outcome.diagnostics;
    var first = Array.isArray(diagnostics) ? diagnostics[0] : null;
    if (first && first.message) return String(first.message);
    if (_outcome && _outcome.reason) return String(_outcome.reason);
    return _fallback;
  }

  function readDashboardFileName(_dashboardFacet) {
    var outcome;
    var data;
    if (!_dashboardFacet || typeof _dashboardFacet.getFileName !== "function") {
      throw { code: "DASHBOARD_PDF_EXPORT_FAILED", message: "Dashboard file name is unavailable." };
    }
    outcome = _dashboardFacet.getFileName();
    if (outcome && outcome.ok === true) {
      data = outcome.data;
      if (data != null && (typeof data === "object" || typeof data === "function")) {
        throw { code: "DASHBOARD_PDF_EXPORT_FAILED", message: "Dashboard file name is unavailable." };
      }
      return data;
    }
    throw {
      code: "DASHBOARD_PDF_EXPORT_FAILED",
      message: readOutcomeFailureMessage(outcome, "Dashboard file name is unavailable.")
    };
  }

  async function runDashboardPdfExport(_KDB, _deps, _options) {
    var options = _options || {};
    var warnings = [];
    var startedAt = Date.now();
    var timeoutMs = typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? options.timeoutMs : 30000;
    var manifest = { activeIndex: null, tabs: [] };
    var fileName;
    var headerState;
    var vendor = _deps.vendors || {};
    var attachmentRows;
    var doc;
    var tabIdx;
    var exportResult = null;
    var restoreResult;
    var focusExit = { ok: true, widgetIds: [] };
    var focusRestore;
    try {
      fileName = readDashboardFileName(readDashboardFacet(_KDB));
      headerState = _KDB.api.header && _KDB.api.header.getState ? _KDB.api.header.getState() : {};
      manifest = _readVisibleTabsManifest(_KDB);
      if (!vendor.jsPdfCtor || !vendor.html2canvas) throw { code: "DASHBOARD_PDF_VENDOR_MISSING", message: "PDF vendors are not available." };
      if (manifest.errorCode) throw { code: manifest.errorCode, message: manifest.errorMessage };
      if (!manifest.tabs.length) throw { code: "DASHBOARD_PDF_NO_VISIBLE_TABS", message: "No visible tabs for export." };
      manifest.fileName = fileName;
      manifest.title = headerState && headerState.titleText ? headerState.titleText : TITLE_FALLBACK;
      manifest.subtitle = headerState && headerState.subtitleText ? headerState.subtitleText : "";
      focusExit = await _manageFocusModeForExport.exitFocusModeForExport(_KDB);
      if (focusExit.warning) warnings.push(focusExit.warning);
      if (!focusExit.ok) throw { code: focusExit.errorCode || "DASHBOARD_PDF_FOCUS_EXIT_FAILED", message: focusExit.errorMessage || "Focus mode exit failed." };
      attachmentRows = await _buildAttachmentRows(_KDB, manifest, warnings);
      doc = new vendor.jsPdfCtor({ orientation: "landscape", unit: "pt", format: "a4" });
      report(options.onProgress, { stage: "title", message: "Rendering title page", elapsedMs: Date.now() - startedAt });
      _renderDashboardPages.addTitlePage(doc, manifest);
      for (tabIdx = 0; tabIdx < manifest.tabs.length; tabIdx += 1) {
        if (isAborted(options.signal)) return abortedResult(warnings, startedAt);
        report(options.onProgress, { stage: "capture", message: "Capturing tab " + String(tabIdx + 1) + "/" + String(manifest.tabs.length), tab: manifest.tabs[tabIdx], elapsedMs: Date.now() - startedAt });
        _renderDashboardPages.addScreenshotPage(
          doc,
          await _captureTabPage(_KDB, manifest.tabs[tabIdx], vendor.html2canvas, options.signal, timeoutMs, tabIdx + 1, manifest.tabs.length),
          manifest.title,
          manifest.tabs[tabIdx].name,
          tabIdx + 1
        );
      }
      if (isAborted(options.signal)) return abortedResult(warnings, startedAt);
      report(options.onProgress, { stage: "attachment", message: "Rendering attachment pages", elapsedMs: Date.now() - startedAt });
      if (isAborted(options.signal)) return abortedResult(warnings, startedAt);
      _renderAttachmentPages(doc, attachmentRows);
      if (isAborted(options.signal)) return abortedResult(warnings, startedAt);
      report(options.onProgress, { stage: "save", message: "Saving PDF", elapsedMs: Date.now() - startedAt });
      if (isAborted(options.signal)) return abortedResult(warnings, startedAt);
      try {
        doc.save(String(fileName || "dashboard") + ".pdf");
      } catch (saveError) {
        throw { code: "DASHBOARD_PDF_SAVE_FAILED", message: String(saveError && saveError.message ? saveError.message : saveError) };
      }
      exportResult = { ok: true, fileName: fileName, tabCount: manifest.tabs.length, warnings: warnings, elapsedMs: Date.now() - startedAt };
      return exportResult;
    } catch (error) {
      return {
        ok: false,
        errorCode: error && error.code ? error.code : "DASHBOARD_PDF_EXPORT_FAILED",
        errorMessage: String(error && error.message ? error.message : error),
        warnings: warnings,
        elapsedMs: Date.now() - startedAt
      };
    } finally {
      restoreResult = await _restoreOriginalTab(_KDB, manifest.activeIndex, timeoutMs);
      focusRestore = await _manageFocusModeForExport.restoreFocusModeForExport(_KDB, focusExit.widgetIds);
      if (exportResult && exportResult.ok === true && restoreResult && restoreResult.ok !== true) {
        warnings.push(restoreResult.warning);
        exportResult.diagnostics = [restoreResult.warning];
      }
      if (exportResult && exportResult.ok === true && focusRestore && focusRestore.ok !== true && focusRestore.warning) {
        warnings.push(focusRestore.warning);
        exportResult.diagnostics = (exportResult.diagnostics || []).concat([focusRestore.warning]);
      }
    }
  }

  return runDashboardPdfExport;
});
