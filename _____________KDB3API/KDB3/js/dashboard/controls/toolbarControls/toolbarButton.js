define(["./config.js"], function (_config) {
  "use strict";

  var BUTTONS = _config.BUTTONS;

  function createElement(tagName, attributes, textContent) {
    var el = document.createElement(tagName);
    attributes.forEach(function (pair) {
      if (pair[1] !== null && pair[1] !== undefined) el.setAttribute(pair[0], pair[1]);
    });
    if (textContent !== undefined) el.textContent = textContent;
    return el;
  }

  function readButtonLabels(_KDB, id) {
    var de = _KDB.config && _KDB.config.labels && _KDB.config.labels.de;
    return Object.assign({}, _config.LABELS[id], (de && de[BUTTONS[id].apiName]) || {});
  }

  function readIconAssets(_KDB, id) {
    return Object.assign({}, _config.ICON_ASSETS[id], (_KDB.config && _KDB.config[BUTTONS[id].apiName]) || {});
  }

  function warnOnce(inst, key, message) {
    if (inst.warned[key]) return;
    inst.warned[key] = true;
    console.warn(message);
  }

  function createButtonInstance(def) {
    return {
      def: def,
      id: def.id,
      refs: { rootEl: null },
      viewModel: Object.assign({}, def.defaultViewModel),
      warned: {},
      boundRootEl: null,
      syncedRootEl: null,
      isInitialized: false,
      isDisposed: false
    };
  }

  function syncButtonView(_KDB, inst, payload) {
    return inst.def.sync(_KDB, inst, payload);
  }

  function updateViewModel(_KDB, inst, partial) {
    inst.viewModel = Object.assign({}, inst.viewModel, partial || {});
    return syncButtonView(_KDB, inst);
  }

  // DOM event boundary: log once, never throw into the browser.
  function runButtonClick(_KDB, inst, onClick, event) {
    var result;
    try {
      result = onClick(_KDB, inst, event);
      if (result && typeof result.catch === "function") {
        result.catch(function (error) { console.error("[" + inst.def.apiName + ".click]", error); });
      }
    } catch (error) {
      console.error("[" + inst.def.apiName + ".click]", error);
    }
  }

  function buildIconElement(config, _KDB, readTone) {
    var meta = BUTTONS[config.id];
    var resolved;
    if (config.icon.build) return config.icon.build();
    resolved = config.icon.resolve(_KDB, readTone);
    return createElement("img", [
      ["class", meta.classPrefix + "__icon" + (resolved.invert ? " " + _config.ICON_INVERT_CLASS : "")],
      [meta.dataPrefix + "-icon", "true"],
      ["aria-hidden", "true"],
      ["src", resolved.href || null]
    ]);
  }

  function buildSingleButtonRoot(config, _KDB, readTone) {
    var meta = BUTTONS[config.id];
    var texts = config.readTexts(_KDB);
    var rootEl = createElement("div", [["class", meta.classPrefix], [meta.dataPrefix + "-controls", "true"]]);
    var itemEl = createElement("div", [["class", meta.classPrefix + "__item"]]);
    var buttonEl = createElement("button", [
      ["type", "button"],
      ["class", meta.classPrefix + "__button"],
      [meta.dataPrefix + "-button", "true"],
      ["aria-label", texts.accessibleName || null],
      ["title", texts.title || null]
    ]);
    var labelEl = createElement(
      "span",
      [["class", meta.classPrefix + "__label"], [meta.dataPrefix + "-label", "true"]].concat(config.labelAttributes || []),
      texts.labelText || ""
    );
    buttonEl.appendChild(buildIconElement(config, _KDB, readTone));
    buttonEl.appendChild(labelEl);
    itemEl.appendChild(buttonEl);
    rootEl.appendChild(itemEl);
    return rootEl;
  }

  function collectSingleButtonRefs(id, rootEl) {
    return {
      rootEl: rootEl,
      buttonEl: rootEl.querySelector(_config.buildPartSelector(id, "button")),
      iconEl: rootEl.querySelector(_config.buildPartSelector(id, "icon")),
      labelEl: rootEl.querySelector(_config.buildPartSelector(id, "label"))
    };
  }

  function syncSingleButton(config, _KDB, inst) {
    var refs = inst.refs;
    var viewModel = inst.viewModel || {};
    var label = viewModel.label || config.defaultLabel || "";
    if (!refs.buttonEl) return false;
    refs.buttonEl.disabled = viewModel.disabled === true;
    if (refs.labelEl && refs.labelEl.textContent !== label) refs.labelEl.textContent = label;
    if (refs.rootEl && refs.rootEl.classList) {
      refs.rootEl.classList.toggle(_config.UNAVAILABLE_CLASS, config.isUnavailable(viewModel));
    }
    if (config.syncExtras) config.syncExtras(inst, viewModel);
    return true;
  }

  function refreshSingleButtonIcon(config, _KDB, inst, readTone) {
    var iconEl = inst.refs.iconEl;
    var resolved;
    if (!iconEl) return;
    resolved = config.icon.resolve(_KDB, readTone);
    if (resolved.href && iconEl.getAttribute("src") !== resolved.href) iconEl.setAttribute("src", resolved.href);
    if (iconEl.classList) iconEl.classList.toggle(_config.ICON_INVERT_CLASS, !!resolved.invert);
  }

  /**
   * Factory for a toolbar button made of one `<button>` with an icon and a label.
   * @param {object} config id (key of config.BUTTONS), readTexts, icon ({ resolve } | { build }), defaultLabel,
   *   defaultViewModel, isUnavailable, onClick, and the optional labelAttributes, syncExtras, initialize,
   *   onDetach, onRegister, extendApi.
   * @returns {object} button definition consumed by toolbarControls/index.js and toolbarHost.js
   */
  function createToolbarButton(config) {
    var meta = BUTTONS[config.id];
    return {
      id: config.id,
      apiName: meta.apiName,
      rootSelector: _config.buildRootSelector(config.id),
      defaultViewModel: config.defaultViewModel,
      buildRoot: function (_KDB, inst, readTone) { return buildSingleButtonRoot(config, _KDB, readTone); },
      collectRefs: collectSingleButtonRefs.bind(null, config.id),
      initialize: config.initialize,
      bind: function (_KDB, inst, signal) {
        if (!inst.refs.buttonEl) return;
        inst.refs.buttonEl.addEventListener("click", function (event) {
          runButtonClick(_KDB, inst, config.onClick, event);
        }, { signal: signal });
      },
      sync: syncSingleButton.bind(null, config),
      refreshIcon: config.icon.resolve ? refreshSingleButtonIcon.bind(null, config) : null,
      onDetach: config.onDetach,
      onRegister: config.onRegister,
      extendApi: config.extendApi
    };
  }

  return {
    createToolbarButton: createToolbarButton,
    createButtonInstance: createButtonInstance,
    createElement: createElement,
    readButtonLabels: readButtonLabels,
    readIconAssets: readIconAssets,
    runButtonClick: runButtonClick,
    syncButtonView: syncButtonView,
    updateViewModel: updateViewModel,
    warnOnce: warnOnce
  };
});
