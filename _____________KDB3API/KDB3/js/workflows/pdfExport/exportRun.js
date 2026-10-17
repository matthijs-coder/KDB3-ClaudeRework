define([
  "../../core/utils/kit/errors.js",
  "./config.js",
  "./tabNavigation.js",
  "./capture/captureTabPage.js",
  "./attachment/buildRows.js",
  "./attachment/renderRows.js"
], function (_errors, _config, _tabNavigation, _captureTabPage, _buildRows, _renderRows) {
  "use strict";

  var CODES = _config.CODES;
  var MM_TO_PT = 72 / 25.4;
  var FOOTER_FONT_SIZE_PT = 10;
  var FOOTER_MARGIN_RIGHT_PT = 10 * MM_TO_PT;
  var FOOTER_MARGIN_BOTTOM_PT = 10 * MM_TO_PT;
  var FOOTER_LINE_GAP_PT = 5 * MM_TO_PT;
  var SUBTITLE_OFFSET_PT = 10 * MM_TO_PT;

  // ---- dashboard pages (title page, one screenshot page per tab) -----------------------------------------------

  function readPageText(value, fallback) {
    var text = value ? String(value).trim() : "";
    return text || fallback;
  }

  function addTitlePage(doc, manifest, labels) {
    var pageWidth = doc.internal.pageSize.getWidth();
    var titleY = doc.internal.pageSize.getHeight() / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(readPageText(manifest.title, labels.titleFallback), pageWidth / 2, titleY, { align: "center" });
    doc.setFontSize(14);
    doc.text(readPageText(manifest.subtitle, labels.subtitleFallback), pageWidth / 2, titleY + SUBTITLE_OFFSET_PT, { align: "center" });
  }

  function addScreenshotPage(doc, imageDataUrl, title, tabName, tabNumber, labels) {
    var pageWidth = doc.internal.pageSize.getWidth();
    var pageHeight = doc.internal.pageSize.getHeight();
    var props = doc.getImageProperties(imageDataUrl);
    var widthRatio = pageWidth / props.width;
    var isHeightLimited = props.height * widthRatio > pageHeight;
    var ratio = isHeightLimited ? pageHeight / props.height : widthRatio;
    var drawW = props.width * ratio;
    var drawH = props.height * ratio;
    var x = (pageWidth - drawW) / 2;
    var y = isHeightLimited ? 0 : (pageHeight - drawH) / 2;
    doc.addPage("a4", "landscape");
    if (isHeightLimited) doc.addImage(imageDataUrl, "PNG", x, y, drawW, drawH);
    else doc.addImage(imageDataUrl, "PNG", x, y, drawW, drawH, undefined, "FAST");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FOOTER_FONT_SIZE_PT);
    doc.text(
      String(title || "").trim() || labels.titleFallback,
      pageWidth - FOOTER_MARGIN_RIGHT_PT,
      pageHeight - FOOTER_MARGIN_BOTTOM_PT - FOOTER_LINE_GAP_PT,
      { align: "right" }
    );
    doc.text(
      labels.pageFooterPrefix + String(tabNumber) + ": " + String(tabName || "-"),
      pageWidth - FOOTER_MARGIN_RIGHT_PT,
      pageHeight - FOOTER_MARGIN_BOTTOM_PT,
      { align: "right" }
    );
  }

  // ---- export run --------------------------------------------------------------------------------------------------

  function isAborted(signal) {
    return !!(signal && signal.aborted);
  }

  function createAbortedResult(run) {
    return {
      ok: false,
      errorCode: CODES.ABORTED,
      errorMessage: _config.ABORTED_MESSAGE,
      warnings: run.warnings,
      elapsedMs: Date.now() - run.startedAt
    };
  }

  function reportProgress(run, payload) {
    if (typeof run.onProgress !== "function") return;
    payload.elapsedMs = Date.now() - run.startedAt;
    try {
      run.onProgress(payload);
    } catch (error) {
      console.warn("[dashboardPdf.export][onProgressFailed]", error);
    }
  }

  function readHeaderState(_KDB) {
    return _KDB.api.header && _KDB.api.header.getState ? _KDB.api.header.getState() : {};
  }

  // run.manifest is set before the checks: restoreAfterExport needs the active tab index even when they fail.
  function readManifest(_KDB, run, fileName) {
    var headerState = readHeaderState(_KDB);
    var manifest = _tabNavigation.readVisibleTabsManifest(_KDB, run.labels);
    run.manifest = manifest;
    if (manifest.errorCode) throw _errors.codedError(manifest.errorCode, manifest.errorMessage);
    if (!manifest.tabs.length) throw _errors.codedError(CODES.NO_VISIBLE_TABS, "No visible tabs for export.");
    manifest.fileName = fileName;
    manifest.title = headerState && headerState.titleText ? headerState.titleText : run.labels.titleFallback;
    manifest.subtitle = headerState && headerState.subtitleText ? headerState.subtitleText : "";
  }

  async function exitFocusMode(_KDB, run) {
    run.focusExit = await _tabNavigation.exitFocusModeForExport(_KDB);
    if (run.focusExit.warning) run.warnings.push(run.focusExit.warning);
    if (!run.focusExit.ok) {
      throw _errors.codedError(run.focusExit.errorCode || CODES.FOCUS_EXIT_FAILED, run.focusExit.errorMessage || "Focus mode exit failed.");
    }
  }

  async function addTabPages(_KDB, vendors, run, doc) {
    var tabs = run.manifest.tabs;
    for (var index = 0; index < tabs.length; index += 1) {
      if (isAborted(run.signal)) return false;
      reportProgress(run, { stage: "capture", message: "Capturing tab " + String(index + 1) + "/" + String(tabs.length), tab: tabs[index] });
      var image = await _captureTabPage.captureTabPage(_KDB, tabs[index], vendors.html2canvas, run, { n: index + 1, m: tabs.length });
      addScreenshotPage(doc, image, run.manifest.title, tabs[index].name, index + 1, run.labels);
    }
    return true;
  }

  function saveDocument(doc, fileName) {
    try {
      doc.save(String(fileName || "dashboard") + ".pdf");
    } catch (error) {
      throw _errors.codedError(CODES.SAVE_FAILED, String(error && error.message ? error.message : error));
    }
  }

  // Returns the success result, or the aborted result when the signal fired.
  async function buildAndSaveDocument(_KDB, vendors, run) {
    var fileName = _buildRows.readDashboardFileName(_KDB.runtime.dashboardPdf.dashboardFacet);
    readManifest(_KDB, run, fileName);
    await exitFocusMode(_KDB, run);
    var attachmentRows = await _buildRows.buildAttachmentRows(_KDB, run.manifest, run.warnings, run.labels);
    var doc = new vendors.jsPdfCtor({ orientation: "landscape", unit: "pt", format: "a4" });
    reportProgress(run, { stage: "title", message: "Rendering title page" });
    addTitlePage(doc, run.manifest, run.labels);
    if (!(await addTabPages(_KDB, vendors, run, doc)) || isAborted(run.signal)) return createAbortedResult(run);
    reportProgress(run, { stage: "attachment", message: "Rendering attachment pages" });
    _renderRows.renderAttachmentPages(doc, attachmentRows, run.labels.attachmentTitle);
    reportProgress(run, { stage: "save", message: "Saving PDF" });
    if (isAborted(run.signal)) return createAbortedResult(run);
    saveDocument(doc, fileName);
    return { ok: true, fileName: fileName, tabCount: run.manifest.tabs.length, warnings: run.warnings, elapsedMs: Date.now() - run.startedAt };
  }

  function createFailureResult(error, run) {
    if (!error || !error.code) console.error("[dashboardPdf.export] unexpected failure", error);
    return {
      ok: false,
      errorCode: error && error.code ? error.code : CODES.EXPORT_FAILED,
      errorMessage: String(error && error.message ? error.message : error),
      warnings: run.warnings,
      elapsedMs: Date.now() - run.startedAt
    };
  }

  // Restores the original tab and focus mode; their failures only surface as warnings of a successful export.
  async function restoreAfterExport(_KDB, run, successResult) {
    var restoreResult = await _tabNavigation.restoreOriginalTab(_KDB, run.manifest.activeIndex, run.timeoutMs);
    var focusRestore = await _tabNavigation.restoreFocusModeForExport(_KDB, run.focusExit.widgetIds);
    if (successResult && restoreResult && restoreResult.ok !== true) {
      run.warnings.push(restoreResult.warning);
      successResult.diagnostics = [restoreResult.warning];
    }
    if (successResult && focusRestore && focusRestore.ok !== true && focusRestore.warning) {
      run.warnings.push(focusRestore.warning);
      successResult.diagnostics = (successResult.diagnostics || []).concat([focusRestore.warning]);
    }
  }

  /**
   * Runs one PDF export: title page, one screenshot per visible tab, attachment page, save.
   * Expected failures are returned as { ok: false, errorCode, errorMessage }; this function does not reject.
   * @param {object} _KDB
   * @param {{jsPdfCtor: Function, html2canvas: Function}} vendors
   * @param {{signal?: AbortSignal, onProgress?: Function, timeoutMs?: number}} options
   */
  async function runDashboardPdfExport(_KDB, vendors, options) {
    var timeoutMs = typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? options.timeoutMs : _config.DEFAULT_EXPORT_TIMEOUT_MS;
    var run = {
      signal: options.signal,
      onProgress: options.onProgress,
      timeoutMs: timeoutMs,
      labels: _config.readLabels(_KDB),
      startedAt: Date.now(),
      warnings: [],
      manifest: { activeIndex: null, tabs: [] },
      focusExit: { ok: true, widgetIds: [] }
    };
    var successResult = null;
    try {
      var result = await buildAndSaveDocument(_KDB, vendors, run);
      if (result.ok) successResult = result;
      return result;
    } catch (error) {
      return createFailureResult(error, run);
    } finally {
      await restoreAfterExport(_KDB, run, successResult);
    }
  }

  return { runDashboardPdfExport: runDashboardPdfExport };
});
