define([
  "./index.js",
  "./config.js",
  "./toolbarButton.js",
  "../../../core/services/historyService/events/eventNames.js"
], function (_index, _config, _button, _historyEventNames) {
  "use strict";

  var ID = "history";
  var META = _config.BUTTONS[ID];
  var ACTION_ATTR = META.dataPrefix + "-action";
  var ACTION_SELECTOR = "[" + ACTION_ATTR + "]";
  var ROOT_SELECTOR = _config.buildRootSelector(ID);

  function readHistoryService(_KDB) {
    return _KDB && _KDB.services && _KDB.services.history ? _KDB.services.history : null;
  }

  function buildHistoryItem(action, label, glyph) {
    var itemEl = _button.createElement("div", [["class", META.classPrefix + "__item"]]);
    var buttonEl = _button.createElement("button", [
      ["type", "button"],
      ["class", META.classPrefix + "__button"],
      [ACTION_ATTR, action],
      ["aria-label", label],
      ["title", label]
    ]);
    buttonEl.appendChild(_button.createElement(
      "span",
      [["class", META.classPrefix + "__icon"], ["aria-hidden", "true"]],
      glyph
    ));
    itemEl.appendChild(buttonEl);
    return itemEl;
  }

  function buildHistoryRoot() {
    var labels = _config.LABELS.history;
    var rootEl = _button.createElement("div", [["class", META.classPrefix], [META.dataPrefix + "-controls", "true"]]);
    rootEl.appendChild(buildHistoryItem("undo", labels.undoLabel, labels.undoGlyph));
    rootEl.appendChild(buildHistoryItem("redo", labels.redoLabel, labels.redoGlyph));
    return rootEl;
  }

  function collectHistoryRefs(rootEl) {
    return {
      rootEl: rootEl,
      undoButtonEl: rootEl.querySelector("[" + ACTION_ATTR + '="undo"]'),
      redoButtonEl: rootEl.querySelector("[" + ACTION_ATTR + '="redo"]')
    };
  }

  function resolveCapability(historyService, payload, name) {
    if (!historyService) return false;
    if (payload && typeof payload[name] === "boolean") return payload[name];
    return typeof historyService[name] === "function" && historyService[name]() === true;
  }

  function setButtonState(buttonEl, isEnabled) {
    buttonEl.disabled = !isEnabled;
    buttonEl.setAttribute("aria-disabled", isEnabled ? "false" : "true");
    buttonEl.classList.toggle(_config.HISTORY_BUTTON_DISABLED_CLASS, !isEnabled);
  }

  function syncHistoryView(_KDB, inst, payload) {
    var refs = inst.refs;
    var historyService = readHistoryService(_KDB);
    if (!refs.rootEl || !refs.undoButtonEl || !refs.redoButtonEl) return false;
    setButtonState(refs.undoButtonEl, resolveCapability(historyService, payload, "canUndo"));
    setButtonState(refs.redoButtonEl, resolveCapability(historyService, payload, "canRedo"));
    return true;
  }

  function runHistoryAction(_KDB, action) {
    var historyService = readHistoryService(_KDB);
    if (historyService && action === "undo" && typeof historyService.undo === "function") {
      return Promise.resolve(historyService.undo());
    }
    if (historyService && action === "redo" && typeof historyService.redo === "function") {
      return Promise.resolve(historyService.redo());
    }
    return Promise.resolve();
  }

  function onHistoryClick(_KDB, inst, event) {
    var target = event.target;
    var buttonEl = target && typeof target.closest === "function" ? target.closest(ACTION_SELECTOR) : null;
    if (!buttonEl || buttonEl.closest(ROOT_SELECTOR) !== inst.refs.rootEl || buttonEl.disabled) return null;
    event.preventDefault();
    return runHistoryAction(_KDB, buttonEl.getAttribute(ACTION_ATTR)).then(function () {
      _button.syncButtonView(_KDB, inst);
    });
  }

  function bindHistoryRoot(_KDB, inst, signal) {
    inst.refs.rootEl.addEventListener("click", function (event) {
      _button.runButtonClick(_KDB, inst, onHistoryClick, event);
    }, { signal: signal });
    if (_KDB.events && typeof _KDB.events.subscribe === "function") {
      _KDB.events.subscribe(_historyEventNames.HISTORY_CHANGED, function (payload) {
        _button.syncButtonView(_KDB, inst, payload);
      }, { signal: signal });
    }
  }

  function initializeHistory(_KDB, inst) {
    if (!readHistoryService(_KDB)) {
      _button.warnOnce(inst, "missingHistoryService", "[historyControls.mount] _KDB.services.history is missing; controls mount disabled");
    }
  }

  var historyDefinition = {
    id: ID,
    apiName: META.apiName,
    rootSelector: ROOT_SELECTOR,
    defaultViewModel: {},
    buildRoot: buildHistoryRoot,
    collectRefs: collectHistoryRefs,
    initialize: initializeHistory,
    bind: bindHistoryRoot,
    sync: syncHistoryView,
    refreshIcon: null,
    onDetach: null,
    onRegister: null,
    extendApi: null
  };

  function registerHistoryControls(_KDB) {
    return _index.registerToolbarButton(_KDB, historyDefinition);
  }

  return registerHistoryControls;
});
