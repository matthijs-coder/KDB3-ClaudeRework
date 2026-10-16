define([], function () {
  "use strict";

  var KNOWN_INTENTS = {
    confirm: true,
    cancel: true,
    clear: true,
    close: true,
    alle: true,
    option: true,
    open: true,
    unknown: true
  };

  function resolveFromInteractionType(_context) {
    var interactionType = _context && _context.interactionType ? String(_context.interactionType) : "unknown";
    if (_context.isAlleOption === true) {
      return { type: "alle", optionLabel: "Alle" };
    }
    if (KNOWN_INTENTS[interactionType]) {
      return { type: interactionType, optionLabel: _context.optionLabel || null };
    }
    return { type: "unknown", optionLabel: null };
  }

  function resolveFromClickedFlags(_context) {
    if (_context.clickedOk) {
      return { type: "confirm", optionLabel: null };
    }
    if (_context.clickedCancel) {
      return { type: "cancel", optionLabel: null };
    }
    if (_context.clickedClear) {
      return { type: "clear", optionLabel: null };
    }
    if (_context.clickedClose) {
      return { type: "close", optionLabel: null };
    }
    if (_context.isAlleOption === true) {
      return { type: "alle", optionLabel: "Alle" };
    }
    return { type: "open", optionLabel: _context.optionLabel || null };
  }

  function __controller(_context) {
    if (!_context) {
      return { type: "unknown", optionLabel: null };
    }
    if (_context.interactionType) {
      return resolveFromInteractionType(_context);
    }
    return resolveFromClickedFlags(_context);
  }

  return __controller;
});
