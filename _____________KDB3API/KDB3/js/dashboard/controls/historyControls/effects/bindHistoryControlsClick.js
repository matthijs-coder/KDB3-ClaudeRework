define([], function () {
  "use strict";

  function readHistoryService(_KDB) {
    return _KDB && _KDB.services && _KDB.services.history ? _KDB.services.history : null;
  }

  function isHistoryButton(_target, _rootEl) {
    if (!_target || !_rootEl || typeof _target.closest !== "function") {
      return null;
    }
    var buttonEl = _target.closest("[data-kdb-history-action]");
    if (!buttonEl || !buttonEl.closest('[data-kdb-history-controls="true"]')) {
      return null;
    }
    if (buttonEl.closest('[data-kdb-history-controls="true"]') !== _rootEl) {
      return null;
    }
    return buttonEl;
  }

  function runHistoryAction(_KDB, _action) {
    var historyService = readHistoryService(_KDB);
    if (!historyService) {
      return Promise.resolve();
    }
    if (_action === "undo" && typeof historyService.undo === "function") {
      return Promise.resolve(historyService.undo());
    }
    if (_action === "redo" && typeof historyService.redo === "function") {
      return Promise.resolve(historyService.redo());
    }
    return Promise.resolve();
  }

  function onHistoryControlsClick(_KDB, _options, _event) {
    var runtime = _KDB.runtime.historyControls;
    var rootEl = runtime.domRefs.rootEl;
    var buttonEl;
    var action;

    buttonEl = isHistoryButton(_event.target, rootEl);
    if (!buttonEl || buttonEl.disabled) {
      return;
    }

    _event.preventDefault();
    action = buttonEl.getAttribute("data-kdb-history-action");
    runHistoryAction(_KDB, action)
      .then(function () {
        if (_options && typeof _options.sync === "function") {
          _options.sync();
        }
      })
      .catch(function (error) {
        console.error("[historyControls.click]", error);
      });
  }

  function __controller(_KDB, _options) {
    var runtime;
    var rootEl;
    var handler;
    var clickController;

    runtime = _KDB.runtime.historyControls;
    rootEl = runtime.domRefs && runtime.domRefs.rootEl;
    if (!rootEl) {
      return false;
    }
    if (runtime.abortControllers.click) {
      return true;
    }

    handler = onHistoryControlsClick.bind(null, _KDB, _options);
    if (typeof AbortController === "function") {
      clickController = new AbortController();
      runtime.abortControllers.click = clickController;
      rootEl.addEventListener("click", handler, { signal: clickController.signal });
      return true;
    }

    rootEl.addEventListener("click", handler);
    runtime.listeners = runtime.listeners || {};
    runtime.listeners.click = function () {
      rootEl.removeEventListener("click", handler);
    };
    return true;
  }

  return __controller;
});
