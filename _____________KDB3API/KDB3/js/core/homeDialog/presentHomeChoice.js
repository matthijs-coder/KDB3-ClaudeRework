define([], function () {
  "use strict";

  function readHomeDialogLabels(_KDB) {
    return _KDB.config && _KDB.config.labels && _KDB.config.labels.de
      ? _KDB.config.labels.de.homeDialog
      : null;
  }

  function readChoiceLabel(_labels, _key) {
    var value = _labels && _labels[_key];
    return typeof value === "string" && value ? value : "";
  }

  function readStampedDashboardFacet(_KDB) {
    var runtime = _KDB.runtime && _KDB.runtime.homeDialog;
    return runtime && runtime.dashboardFacet ? runtime.dashboardFacet : null;
  }

  function navigateHomeClose(_dashboardFacet) {
    try {
      if (!_dashboardFacet || typeof _dashboardFacet.replaceWithBiHomePerspective !== "function") {
        console.warn("[homeDialog.presentHomeChoice] dashboardFacet.replaceWithBiHomePerspective is missing");
        return;
      }
      _dashboardFacet.replaceWithBiHomePerspective();
    } catch (error) {
      console.error("[homeDialog.presentHomeChoice] close navigation failed", error);
    }
  }

  async function navigateHomeMinimize(_dashboardFacet) {
    try {
      if (!_dashboardFacet || typeof _dashboardFacet.openAppView !== "function") {
        console.warn("[homeDialog.presentHomeChoice] dashboardFacet.openAppView is missing");
        return;
      }
      await _dashboardFacet.openAppView("home");
    } catch (error) {
      console.error("[homeDialog.presentHomeChoice] minimize navigation failed", error);
    }
  }

  async function applySelectedHomeChoice(_KDB, _choiceId) {
    try {
      var dashboardFacet = readStampedDashboardFacet(_KDB);
      if (_choiceId === "home-close") {
        navigateHomeClose(dashboardFacet);
        return;
      }
      if (_choiceId === "home-minimize") {
        await navigateHomeMinimize(dashboardFacet);
      }
    } catch (error) {
      console.error("[homeDialog.presentHomeChoice] selected choice failed", error);
    }
  }

  async function __controller(_KDB, _options) {
    try {
      var options = _options || {};
      var labels = readHomeDialogLabels(_KDB);
      var closeLabel = readChoiceLabel(labels, "closeLabel");
      var minimizeLabel = readChoiceLabel(labels, "minimizeLabel");
      var instruction = readChoiceLabel(labels, "navInstruction");
      var messageService = _KDB.services && _KDB.services.message;
      var message;
      var result;
      if (!closeLabel || !minimizeLabel) {
        console.warn("[homeDialog.presentHomeChoice] homeDialog close/minimize labels are empty");
        return;
      }
      if (!messageService || typeof messageService.choose !== "function") {
        console.warn("[homeDialog.presentHomeChoice] services.message.choose is missing");
        return;
      }
      if (instruction) {
        message = (options.message ? options.message + "\n\n" : "") + instruction;
      } else {
        console.warn("[homeDialog.presentHomeChoice] homeDialog navInstruction is empty");
        message = options.message;
      }
      result = await messageService.choose({
        code: options.code,
        title: options.title,
        message: message,
        severity: options.severity,
        showCancel: false,
        choices: [
          { id: "home-close", label: closeLabel },
          { id: "home-minimize", label: minimizeLabel }
        ]
      });
      if (!result || result.reason !== "selected" || !result.choice) {
        return;
      }
      await applySelectedHomeChoice(_KDB, result.choice);
    } catch (error) {
      console.error("[homeDialog.presentHomeChoice] failed", error);
    }
  }

  return __controller;
});
