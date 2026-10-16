define([
  "./get/createWritebackGetService.js",
  "./set/createWritebackSetService.js",
  "./map/createWritebackMapService.js",
  "./cognosWritebackBridge.js",
  "./set/config/writebackLabels.js",
], function (
  _createWritebackGetService,
  _createWritebackSetService,
  _createWritebackMapService,
  _createCognosWritebackBridge,
  _writebackLabels
) {
  "use strict";

  // Registers the three writeback services per contracts/writeback.md §0/§1,
  // plus the guarded Cognos bridge. The bridge is installed on window.top by
  // default so WBParameterGetFunction/WBParameterSetFunction are always
  // reachable for the external extension; pass
  // options.installCognosBridge === false to keep the globals off, or call
  // _KDB.services.writebackBridge.uninstall() at runtime.
  function __orchestrator(_KDB, _options) {
    const options = _options || {};
    try {
      _KDB.services = _KDB.services || {};
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.writeback = normalizeWritebackRuntime(_KDB.runtime.writeback);
      mergeWritebackLabels(_KDB);

      if (!_KDB.services.writebackGet) {
        _KDB.services.writebackGet = _createWritebackGetService({ _KDB: _KDB, options: options });
      }
      if (!_KDB.services.writebackSet) {
        _KDB.services.writebackSet = _createWritebackSetService({ _KDB: _KDB, options: options });
      }
      if (!_KDB.services.writebackMap) {
        _KDB.services.writebackMap = _createWritebackMapService({ _KDB: _KDB, options: options });
      }
      if (!_KDB.services.writebackBridge) {
        _KDB.services.writebackBridge = _createCognosWritebackBridge({ _KDB: _KDB, options: options });
      }
      if (options.installCognosBridge !== false) {
        _KDB.services.writebackBridge.install();
      }
      return _KDB.services;
    } catch (error) {
      console.error("[writeback.__orchestrator] service startup failed", error);
      throw error;
    }
  }

  function mergeWritebackLabels(_KDB) {
    var existing;
    _KDB.config = _KDB.config || {};
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
    existing = _KDB.config.labels.de.writeback && typeof _KDB.config.labels.de.writeback === "object"
      ? _KDB.config.labels.de.writeback
      : {};
    _KDB.config.labels.de.writeback = Object.assign({}, _writebackLabels, existing);
  }

  // Runtime restore state per contracts/writeback.md §6.
  function normalizeWritebackRuntime(writebackRuntime) {
    const runtime = writebackRuntime && typeof writebackRuntime === "object" ? writebackRuntime : {};
    runtime.parameterSetRestoreActive = runtime.parameterSetRestoreActive === true;
    runtime.parameterSetRestoreActiveCount = typeof runtime.parameterSetRestoreActiveCount === "number"
      ? runtime.parameterSetRestoreActiveCount : 0;
    runtime.parameterSetRestoreRunId = typeof runtime.parameterSetRestoreRunId === "number"
      ? runtime.parameterSetRestoreRunId : 0;
    runtime.pendingRunId = runtime.pendingRunId == null ? null : runtime.pendingRunId;
    if (runtime.skipDiscardConfirmOnce !== true) runtime.skipDiscardConfirmOnce = false;
    if (runtime.lastConfirmedParameterSetId === undefined) runtime.lastConfirmedParameterSetId = null;
    if (runtime.discardConfirmInFlight !== true) runtime.discardConfirmInFlight = false;
    if (runtime.pendingUrlShareMessage === undefined) runtime.pendingUrlShareMessage = null;
    if (runtime.pendingRestoreFailure !== true) runtime.pendingRestoreFailure = false;
    if (runtime.pendingRestoreInfo === undefined) runtime.pendingRestoreInfo = null;
    if (runtime.urlShareRestoreWaiter === undefined) runtime.urlShareRestoreWaiter = null;
    if (runtime.urlShareStartupPromise === undefined) runtime.urlShareStartupPromise = null;
    if (runtime.urlShareBootOverlayActive !== true) runtime.urlShareBootOverlayActive = false;
    if (!runtime.abortControllers || typeof runtime.abortControllers !== "object") runtime.abortControllers = {};
    if (!runtime.timers || typeof runtime.timers !== "object") runtime.timers = {};
    return runtime;
  }

  return __orchestrator;
});
