define([
  "./config/domSelectors.js",
  "./config/messageLabels.js",
  "./createMessageService.js"
], function (_domSelectors, _messageLabels, _createMessageService) {
  "use strict";

  function registerLabels(_KDB) {
    var existing;
    _KDB.config = _KDB.config || {};
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
    existing = _KDB.config.labels.de.message || {};
    _KDB.config.labels.de.message = Object.assign({}, _messageLabels, existing);
    return _KDB.config.labels.de.message;
  }

  function registerSelectors(_KDB) {
    var existing;
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
    existing = _KDB.elements.selectors.messageService || {};
    _KDB.elements.selectors.messageService = Object.assign({}, _domSelectors, existing);
  }

  function readMessagesFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.messages ? service.messages : null;
  }

  function stampHostFacets(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.messageService = _KDB.runtime.messageService || {};
    _KDB.runtime.messageService.messagesFacet = readMessagesFacet(_KDB);
  }

  function __orchestrator(_KDB) {
    var labels;
    try {
      _KDB.services = _KDB.services || {};
      stampHostFacets(_KDB);
      if (_KDB.services.message) return _KDB.services.message;
      labels = registerLabels(_KDB);
      registerSelectors(_KDB);
      _KDB.services.message = _createMessageService(_KDB, { labels: labels });
      stampHostFacets(_KDB);
      return _KDB.services.message;
    } catch (error) {
      console.error("[messageService.__orchestrator] failed", error);
      throw error;
    }
  }

  return __orchestrator;
});
