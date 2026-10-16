define(["../view/resolveScopedDienststelleFilterDom.js"], function (_scopedDom) {
  "use strict";

  function readTemplate(_KDB) {
    var labels =
      _KDB.config &&
      _KDB.config.labels &&
      _KDB.config.labels.de &&
      _KDB.config.labels.de.dienststelle;
    var value = labels && labels.emptyOkDefaultRequired;
    if (typeof value !== "string") {
      return "";
    }
    return value;
  }

  function interpolateFilterName(_template, _filterName) {
    return _template.split("{filterName}").join(String(_filterName));
  }

  function readConnectedWrapper(_activeFilterKey, _filterScope) {
    var wrapper = _scopedDom.findScopedFilterWrapper(_activeFilterKey, _filterScope);
    if (wrapper && wrapper.isConnected === true) {
      return wrapper;
    }
    return null;
  }

  function notifyMessage(_KDB, _message, _wrapper) {
    var svc = _KDB.services && _KDB.services.message;
    if (!svc) {
      console.warn("[dienststelle.notifyDienststelleEmptyOk] messageService missing");
      return;
    }
    if (_wrapper && typeof svc.notifyAnchored === "function") {
      svc.notifyAnchored({
        anchor: _wrapper,
        code: "DIENSTSTELLE_EMPTY_OK_DEFAULT",
        message: _message,
        severity: "info",
        durationMs: 15000
      });
      return;
    }
    if (typeof svc.notify === "function") {
      svc.notify({
        code: "DIENSTSTELLE_EMPTY_OK_DEFAULT",
        message: _message,
        severity: "info"
      });
      return;
    }
    console.warn("[dienststelle.notifyDienststelleEmptyOk] messageService missing");
  }

  function __controller(_KDB, _options) {
    try {
      var options = _options || {};
      var appliedCount = options.appliedCount;
      var template;
      var visibleFilterLabel;
      var filterName;
      if (typeof appliedCount !== "number" || appliedCount < 1) {
        return;
      }
      if (options.commitFromUser !== true) {
        return;
      }
      if (options.isHistoryReplay === true) {
        return;
      }
      template = readTemplate(_KDB);
      if (!template) {
        console.warn("[dienststelle.notifyDienststelleEmptyOk] missing label");
        return;
      }
      visibleFilterLabel = typeof options.visibleFilterLabel === "string" ? options.visibleFilterLabel.trim() : "";
      filterName = visibleFilterLabel || "Dienststelle";
      notifyMessage(
        _KDB,
        interpolateFilterName(template, filterName),
        readConnectedWrapper(options.activeFilterKey, options.filterScope)
      );
    } catch (err) {
      console.error("[dienststelle.notifyDienststelleEmptyOk]", err);
      return;
    }
  }

  return __controller;
});
