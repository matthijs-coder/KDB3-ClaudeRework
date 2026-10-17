define([
  "./registerButton.js",
  "./config.js",
  "./toolbarButton.js",
  "./toolbarHost.js",
  "./iconHref.js"
], function (_index, _config, _button, _host, _iconHref) {
  "use strict";

  var ID = "pdf";
  var LABELS = _config.LABELS.pdf;
  var EXPORT_KEY = "pdfExportRun";
  var STOP_ERROR_CODES = ["DASHBOARD_PDF_ABORTED", "DASHBOARD_PDF_DISPOSED"];
  var DISPOSED_CODE = "DASHBOARD_PDF_DISPOSED";

  function readExportService(_KDB) {
    var service = _KDB.services && _KDB.services.dashboardPdf;
    return service && typeof service.exportDashboardPdf === "function" ? service : null;
  }

  function buildViewModel(isAvailable, isBusy, label) {
    return { disabled: !isAvailable || isBusy, busy: isBusy, serviceAvailable: isAvailable, label: label };
  }

  function warnMissingService(inst) {
    _button.warnOnce(inst, "missingService", "[pdfExportControls.mount] _KDB.services.dashboardPdf is missing; controls disabled.");
  }

  function showFatalError(_KDB, result) {
    var messageService = _KDB.services && _KDB.services.message;
    var message = result && result.errorMessage ? result.errorMessage : LABELS.fatalMessage;
    console.error("[pdfExportControls.export]", result);
    if (!messageService || typeof messageService.showAlert !== "function") return;
    try {
      messageService.showAlert({ message: message, severity: "error", title: LABELS.fatalTitle });
    } catch (error) {
      console.warn("[pdfExportControls.export][fatalMessageFailed]", error);
    }
  }

  function isExpectedStop(inst, errorCode) {
    return inst.isDisposed || STOP_ERROR_CODES.indexOf(errorCode) !== -1;
  }

  // A disposed service (dashboard closed mid-export) is told apart from a user abort in the log.
  function logStop(errorCode) {
    var reason = errorCode === DISPOSED_CODE ? "disposed: the dashboard was closed during the export" : "aborted";
    console.debug("[pdfExportControls.export] stopped (" + reason + ")", errorCode);
  }

  function reportExportResult(_KDB, inst, result) {
    var errorCode = result && result.errorCode;
    if (result && result.ok === true) return true;
    if (errorCode === "DASHBOARD_PDF_BUSY") return false;
    if (isExpectedStop(inst, errorCode)) {
      logStop(errorCode);
      return false;
    }
    showFatalError(_KDB, result || {});
    return false;
  }

  function startExport(_KDB, inst, rt, service) {
    var scope = new AbortController();
    var exportRun;
    if (rt.abortControllers[EXPORT_KEY]) rt.abortControllers[EXPORT_KEY].abort();
    rt.abortControllers[EXPORT_KEY] = scope;
    exportRun = new Promise(function (resolve) {
      resolve(service.exportDashboardPdf({
        signal: scope.signal,
        onProgress: function (payload) {
          var stage = payload && payload.stage ? payload.stage : "run";
          if (!inst.isDisposed) _button.updateViewModel(_KDB, inst, buildViewModel(true, true, LABELS.progressLabelPrefix + stage));
        }
      }));
    })
      .then(reportExportResult.bind(null, _KDB, inst))
      .catch(function (error) {
        if (isExpectedStop(inst, error && error.code)) logStop(error && error.code);
        else console.error("[pdfExportControls.export]", error);
        return false;
      })
      .finally(function () {
        if (rt.abortControllers[EXPORT_KEY] === scope) rt.abortControllers[EXPORT_KEY] = null;
        if (rt.pendingPromises[EXPORT_KEY] === exportRun) rt.pendingPromises[EXPORT_KEY] = null;
        if (!inst.isDisposed) _button.updateViewModel(_KDB, inst, buildViewModel(true, false, LABELS.buttonLabel));
      });
    rt.pendingPromises[EXPORT_KEY] = exportRun;
    return exportRun;
  }

  function runExport(_KDB, inst) {
    var rt = _host.ensureHostRuntime(_KDB);
    var service = readExportService(_KDB);
    if (!service) {
      warnMissingService(inst);
      _button.updateViewModel(_KDB, inst, buildViewModel(false, false, LABELS.buttonLabel));
      return Promise.resolve(false);
    }
    if (rt.pendingPromises[EXPORT_KEY]) return rt.pendingPromises[EXPORT_KEY];
    _button.updateViewModel(_KDB, inst, buildViewModel(true, true, LABELS.busyLabel));
    return startExport(_KDB, inst, rt, service);
  }

  function initializePdf(_KDB, inst) {
    var rt = _host.ensureHostRuntime(_KDB);
    if (!readExportService(_KDB)) {
      warnMissingService(inst);
      inst.viewModel = buildViewModel(false, false, LABELS.buttonLabel);
    } else if (!rt.pendingPromises[EXPORT_KEY]) {
      inst.viewModel = buildViewModel(true, false, LABELS.buttonLabel);
    }
  }

  function abortExport(_KDB) {
    var rt = _host.ensureHostRuntime(_KDB);
    if (rt.abortControllers[EXPORT_KEY]) rt.abortControllers[EXPORT_KEY].abort();
    rt.abortControllers[EXPORT_KEY] = null;
  }

  function resolvePdfIcon(_KDB, readTone) {
    return { href: _iconHref.pickToneIconHref(readTone(), _button.readIconAssets(_KDB, ID)), invert: false };
  }

  var pdfDefinition = _button.createToolbarButton({
    id: ID,
    readTexts: function () {
      return { accessibleName: LABELS.accessibleName, title: LABELS.accessibleName, labelText: LABELS.buttonLabel };
    },
    icon: { resolve: resolvePdfIcon },
    labelAttributes: [["aria-live", "polite"], ["aria-atomic", "true"]],
    defaultLabel: LABELS.buttonLabel,
    defaultViewModel: buildViewModel(true, false, LABELS.buttonLabel),
    isUnavailable: function (viewModel) { return viewModel.serviceAvailable !== true || viewModel.busy === true; },
    syncExtras: function (inst, viewModel) {
      inst.refs.buttonEl.setAttribute("aria-busy", viewModel.busy === true ? "true" : "false");
    },
    initialize: initializePdf,
    onClick: runExport,
    onDetach: abortExport
  });

  function registerPdfExportControls(_KDB) {
    return _index.registerToolbarButton(_KDB, pdfDefinition);
  }

  return registerPdfExportControls;
});
