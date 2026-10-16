define([], function () {
  "use strict";

  var APPLY_ON_REASON = {
    startup: true,
    visType: true,
    showValues: true,
    iterator: true,
    zoom: true,
    valueCaption: true,
    contentCreate: true
  };

  function shouldApplyVisualizationProperties(_input, _runtime, _normalizedVisType, _options) {
    var options = _options || {};
    if (options.force === true || options.phase === "postRender") {
      return true;
    }
    var reason = _input && _input.reason;
    if (reason === "cleanup" || (_input && _input.forceEmpty === true)) {
      return false;
    }
    if (APPLY_ON_REASON[reason] === true) {
      return true;
    }
    var lastApplied = _runtime && _runtime.lastAppliedVisPropertiesType;
    return lastApplied !== _normalizedVisType;
  }

  return shouldApplyVisualizationProperties;
});
