define([], function () {
  "use strict";

  function __controller(_event) {
    const originalEvent = _event && (_event.originalEvent || _event);
    const dataTransfer = originalEvent ? originalEvent.dataTransfer : null;

    if (!dataTransfer || typeof dataTransfer.getData !== "function") {
      return null;
    }
    return parseJson(dataTransfer.getData("application/json")) ||
      parseJson(dataTransfer.getData("text/plain"));
  }

  function parseJson(rawValue) {
    if (!rawValue) {
      return null;
    }
    try {
      return JSON.parse(rawValue);
    } catch (error) {
      return null;
    }
  }

  return __controller;
});
