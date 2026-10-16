define([
  "./get/createWritebackGetService.js",
  "./set/createWritebackSetService.js",
  "./map/createWritebackMapService.js",
  "./cognosWritebackBridge.js",
  "./set/config/writebackLabels.js",
  "./set/state/ensureWritebackRuntime.js",
], function (
  _createWritebackGetService,
  _createWritebackSetService,
  _createWritebackMapService,
  _createCognosWritebackBridge,
  _writebackLabels,
  _ensureWritebackRuntime
) {
  "use strict";

  // Registers the three writeback services plus the guarded Cognos bridge. The bridge is installed on
  // window.top by default so WBParameterGetFunction/WBParameterSetFunction are always reachable for the
  // external extension; pass options.installCognosBridge === false to keep the globals off, or call
  // _KDB.services.writebackBridge.uninstall() at runtime.
  function __orchestrator(_KDB, _options) {
    const options = _options || {};
    _KDB.services = _KDB.services || {};
    _ensureWritebackRuntime(_KDB);
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
  }

  function mergeWritebackLabels(_KDB) {
    _KDB.config = _KDB.config || {};
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
    const existing = _KDB.config.labels.de.writeback && typeof _KDB.config.labels.de.writeback === "object"
      ? _KDB.config.labels.de.writeback
      : {};
    _KDB.config.labels.de.writeback = Object.assign({}, _writebackLabels, existing);
  }

  return __orchestrator;
});
