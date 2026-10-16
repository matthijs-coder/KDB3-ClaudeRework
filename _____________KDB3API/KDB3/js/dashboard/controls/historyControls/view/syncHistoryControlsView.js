define([], function () {
  "use strict";

  function readHistoryService(_KDB) {
    return _KDB && _KDB.services && _KDB.services.history ? _KDB.services.history : null;
  }

  function resolveCapability(_historyService, _payload, _name) {
    if (_payload && typeof _payload[_name] === "boolean") {
      return _payload[_name];
    }
    if (_historyService && typeof _historyService[_name] === "function") {
      return _historyService[_name]() === true;
    }
    return false;
  }

  function setButtonState(_buttonEl, _isEnabled) {
    if (!_buttonEl) {
      return;
    }
    _buttonEl.disabled = !_isEnabled;
    _buttonEl.setAttribute("aria-disabled", _isEnabled ? "false" : "true");
    _buttonEl.classList.toggle("kdb-history-controls__button--disabled", !_isEnabled);
  }

  function __controller(_KDB, _payload) {
    var runtime;
    var historyService;
    var canUndo;
    var canRedo;

    runtime = _KDB && _KDB.runtime && _KDB.runtime.historyControls;
    if (!runtime || !runtime.domRefs || !runtime.domRefs.rootEl) {
      return false;
    }
    if (!runtime.domRefs.undoButtonEl || !runtime.domRefs.redoButtonEl) {
      return false;
    }

    historyService = readHistoryService(_KDB);
    if (!historyService) {
      setButtonState(runtime.domRefs.undoButtonEl, false);
      setButtonState(runtime.domRefs.redoButtonEl, false);
      return true;
    }

    canUndo = resolveCapability(historyService, _payload, "canUndo");
    canRedo = resolveCapability(historyService, _payload, "canRedo");

    setButtonState(runtime.domRefs.undoButtonEl, canUndo);
    setButtonState(runtime.domRefs.redoButtonEl, canRedo);
    return true;
  }

  return __controller;
});
