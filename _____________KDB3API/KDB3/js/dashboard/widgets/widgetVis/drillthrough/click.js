define([
  "../runtime.js"
], function (_visRuntime) {
  "use strict";

  function noopDispose() {
    return;
  }

  function openFromClick(_options, _event) {
    var label = "[widgetVis.drillthroughClick." + _options.logLabel + "]";
    var spec;
    var service;
    var result;
    try {
      if (_event) {
        _event.preventDefault();
        _event.stopPropagation();
      }
      spec = _options.makeSpec();
      if (!spec) {
        if (_options.logMissingSpec) {
          console.error(label, "spec assembly failed");
        }
        return;
      }
      service = _visRuntime.readHostFacet(_options._KDB, "drillthroughService");
      if (!service || typeof service.openDrillthrough !== "function") {
        console.error(label, "missing service");
        return;
      }
      result = service.openDrillthrough(spec);
      if (result && result.ok === false) {
        console.error(label, result.errorCode || result);
      }
    } catch (err) {
      console.error(label, "failed", err);
    }
  }

  function removeClick(_anchorEl, _handler) {
    _anchorEl.removeEventListener("click", _handler, true);
  }

  function bindDrillthroughClick(_options) {
    var options = _options || {};
    var listeners = options.runtime.listeners;
    var handler;
    var dispose;
    if (typeof listeners[options.listenerKey] === "function") {
      listeners[options.listenerKey]();
    }
    if (!options.anchorEl) {
      return noopDispose;
    }
    handler = openFromClick.bind(null, options);
    options.anchorEl.addEventListener("click", handler, true);
    dispose = removeClick.bind(null, options.anchorEl, handler);
    listeners[options.listenerKey] = dispose;
    return dispose;
  }

  return {
    bindDrillthroughClick: bindDrillthroughClick
  };
});
