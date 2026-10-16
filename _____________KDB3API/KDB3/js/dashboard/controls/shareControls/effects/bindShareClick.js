define([
  "./readDashboardFacet.js",
  "./openShareCopyDialog.js"
], function (_readDashboardFacet, _openShareCopyDialog) {
  "use strict";

  var didWarnMissingFacetMethods = false;

  function isOutcomePresent(_outcome) {
    return !!(
      _outcome &&
      _outcome.ok === true &&
      typeof _outcome.data === "string" &&
      _outcome.data.length > 0
    );
  }

  function readShareLabels(_KDB) {
    var de = _KDB.config && _KDB.config.labels && _KDB.config.labels.de;
    return (de && de.shareControls) || {};
  }

  function warnMissingFacetMethodsOnce() {
    if (didWarnMissingFacetMethods) return;
    didWarnMissingFacetMethods = true;
    console.warn("[shareControls.click] stamped dashboardFacet methods are missing");
  }

  function resolveDialogTitle(_labels, _id, _labelText) {
    if (_id != null) return String(_labels.dialogTitleWithSet || "").split("{label}").join(_labelText);
    return _labels.dialogTitleWithoutSet;
  }

  function onShareClick(_KDB) {
    var runtime;
    var viewModel;
    var selected;
    var facet;
    var labels;
    var message;
    var boardOutcome;
    var baseOutcome;
    var labelText;
    try {
      runtime = _KDB.runtime.shareControls;
      viewModel = runtime.viewModel || {};
      if (viewModel.serviceAvailable === false || viewModel.disabled === true) return;
      selected = _KDB.services.writebackBridge.readSelectedParameterSet();
      facet = _readDashboardFacet(_KDB);
      if (!facet || typeof facet.getBoardId !== "function" || typeof facet.getDashboardBiBaseUrl !== "function") {
        warnMissingFacetMethodsOnce();
        return;
      }
      labels = readShareLabels(_KDB);
      message = _KDB.services.message;
      boardOutcome = facet.getBoardId();
      if (!isOutcomePresent(boardOutcome)) {
        message.showAlert({
          title: labels.boardIdMissingTitle,
          message: labels.boardIdMissingMessage,
          severity: "error"
        });
        return;
      }
      baseOutcome = facet.getDashboardBiBaseUrl();
      if (!isOutcomePresent(baseOutcome)) {
        message.showAlert({
          title: labels.biBaseMissingTitle,
          message: labels.biBaseMissingMessage,
          severity: "error"
        });
        return;
      }
      selected = selected || {};
      labelText = selected.label && String(selected.label).length ? String(selected.label) : labels.emptyParameterLabel;
      _openShareCopyDialog(_KDB, {
        biBase: baseOutcome.data,
        boardId: boardOutcome.data,
        id: selected.id,
        label: selected.label,
        emptyParameterLabel: labels.emptyParameterLabel,
        title: resolveDialogTitle(labels, selected.id, labelText),
        labels: labels
      });
    } catch (err) {
      console.error("[shareControls.click]", err);
    }
  }

  function clearShareClick(_buttonEl, _onClick, _runtime) {
    _buttonEl.removeEventListener("click", _onClick);
    _runtime.listeners.clickCleanup = null;
  }

  function bindShareClick(_KDB) {
    var runtime = _KDB.runtime.shareControls;
    var buttonEl = runtime.domRefs.buttonEl;
    var onClick;
    if (!buttonEl) return false;
    if (runtime.listeners.clickCleanup) runtime.listeners.clickCleanup();
    onClick = onShareClick.bind(null, _KDB);
    buttonEl.addEventListener("click", onClick);
    runtime.listeners.clickCleanup = clearShareClick.bind(null, buttonEl, onClick, runtime);
    return true;
  }

  return bindShareClick;
});
