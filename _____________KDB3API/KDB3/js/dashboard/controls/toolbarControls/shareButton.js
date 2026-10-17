define([
  "./registerButton.js",
  "./config.js",
  "./toolbarButton.js",
  "./toolbarHost.js",
  "./shareLink.js"
], function (_index, _config, _button, _host, _shareLink) {
  "use strict";

  var ID = "share";
  var DEFAULT_LABELS = _config.LABELS.share;

  function readDashboardFacet(_KDB) {
    return _host.ensureHostRuntime(_KDB).dashboardFacet;
  }

  function hasFacetMethods(facet) {
    return !!(facet && typeof facet.getBoardId === "function" && typeof facet.getDashboardBiBaseUrl === "function");
  }

  function hasShareDependencies(_KDB) {
    var services = _KDB.services || {};
    var bridge = services.writebackBridge;
    var message = services.message;
    return !!(
      bridge && typeof bridge.readSelectedParameterSet === "function" &&
      message && typeof message.showCopyable === "function" && typeof message.showAlert === "function" &&
      hasFacetMethods(readDashboardFacet(_KDB))
    );
  }

  function isOutcomePresent(outcome) {
    return !!(outcome && outcome.ok === true && typeof outcome.data === "string" && outcome.data.length > 0);
  }

  function resolveDialogTitle(labels, id, labelText) {
    if (id != null) return String(labels.dialogTitleWithSet || "").split("{label}").join(labelText);
    return labels.dialogTitleWithoutSet;
  }

  function showShareUnavailable(_KDB, title, message) {
    _KDB.services.message.showAlert({ title: title, message: message, severity: "error" });
  }

  function onShareClick(_KDB, inst) {
    var viewModel = inst.viewModel || {};
    var facet;
    var labels;
    var selected;
    var boardOutcome;
    var baseOutcome;
    var labelText;
    if (viewModel.serviceAvailable === false || viewModel.disabled === true) return;
    selected = _KDB.services.writebackBridge.readSelectedParameterSet();
    facet = readDashboardFacet(_KDB);
    if (!hasFacetMethods(facet)) {
      _button.warnOnce(inst, "missingFacetMethods", "[shareControls.click] stamped dashboardFacet methods are missing");
      return;
    }
    labels = _button.readButtonLabels(_KDB, ID);
    boardOutcome = facet.getBoardId();
    if (!isOutcomePresent(boardOutcome)) return showShareUnavailable(_KDB, labels.boardIdMissingTitle, labels.boardIdMissingMessage);
    baseOutcome = facet.getDashboardBiBaseUrl();
    if (!isOutcomePresent(baseOutcome)) return showShareUnavailable(_KDB, labels.biBaseMissingTitle, labels.biBaseMissingMessage);
    selected = selected || {};
    labelText = selected.label && String(selected.label).length ? String(selected.label) : labels.emptyParameterLabel;
    _shareLink.openShareCopyDialog(_KDB, {
      biBase: baseOutcome.data,
      boardId: boardOutcome.data,
      id: selected.id,
      label: selected.label,
      emptyParameterLabel: labels.emptyParameterLabel,
      title: resolveDialogTitle(labels, selected.id, labelText),
      labels: labels
    });
  }

  function initializeShare(_KDB, inst) {
    var label = _button.readButtonLabels(_KDB, ID).buttonTitle || "";
    var isAvailable = hasShareDependencies(_KDB);
    if (!isAvailable) {
      _button.warnOnce(
        inst,
        "missingService",
        "[shareControls.mount] required share services or stamped dashboardFacet methods are missing; controls disabled."
      );
    }
    inst.viewModel = { disabled: !isAvailable, busy: false, serviceAvailable: isAvailable, label: label };
  }

  function resolveShareIcon(_KDB, readTone) {
    return { href: _button.readIconAssets(_KDB, ID).iconHref || "", invert: readTone() === "light" };
  }

  var shareDefinition = _button.createToolbarButton({
    id: ID,
    readTexts: function (_KDB) {
      var labels = _button.readButtonLabels(_KDB, ID);
      return { accessibleName: labels.buttonAccessibleName, title: labels.buttonTitle, labelText: labels.buttonTitle };
    },
    icon: { resolve: resolveShareIcon },
    defaultLabel: "",
    defaultViewModel: { disabled: false, busy: false, serviceAvailable: true, label: DEFAULT_LABELS.buttonTitle },
    isUnavailable: function (viewModel) { return viewModel.serviceAvailable !== true; },
    initialize: initializeShare,
    onClick: onShareClick,
    onRegister: function (_KDB, rt) {
      var cognosHost = _KDB.services && _KDB.services.cognosHost;
      rt.dashboardFacet = (cognosHost && cognosHost.dashboard) || null;
      _shareLink.applyShareReadOnlyChrome(_KDB);
    },
    extendApi: function (_KDB, api) {
      api.applyReadOnlyChrome = _shareLink.applyShareReadOnlyChrome.bind(null, _KDB);
    }
  });

  function registerShareControls(_KDB) {
    return _index.registerToolbarButton(_KDB, shareDefinition);
  }

  return registerShareControls;
});
