define([
  "./index.js",
  "./config.js",
  "./toolbarButton.js",
  "./wienKiPopup.js"
], function (_index, _config, _button, _wienKiPopup) {
  "use strict";

  var ID = "wienKi";
  var META = _config.BUTTONS[ID];
  var SVG_NS = "http://www.w3.org/2000/svg";
  var ICON_PATH =
    "M5.5 1.6h13a3.1 3.1 0 0 1 3.1 3.1v8.6a3.1 3.1 0 0 1-3.1 3.1h-7.4L4.2 22.2l2.2-5.8H5.5A3.1 3.1 0 0 1 2.4 13.3V4.7A3.1 3.1 0 0 1 5.5 1.6z" +
    "M6.15 4.7h2.35v3.15L12.05 4.7h2.55L11.1 8.85l3.75 5.15h-2.6L8.5 9.85v4.15H6.15zm9.7 0h2.4v9.3h-2.4z";

  function buildSpeechBubbleIcon() {
    var svgEl = document.createElementNS(SVG_NS, "svg");
    var pathEl = document.createElementNS(SVG_NS, "path");
    svgEl.setAttribute("viewBox", "0 0 24 24");
    svgEl.setAttribute("width", "24");
    svgEl.setAttribute("height", "24");
    svgEl.setAttribute("class", META.classPrefix + "__icon");
    svgEl.setAttribute(META.dataPrefix + "-icon", "true");
    svgEl.setAttribute("aria-hidden", "true");
    svgEl.setAttribute("focusable", "false");
    pathEl.setAttribute("fill", "currentColor");
    pathEl.setAttribute("fill-rule", "evenodd");
    pathEl.setAttribute("d", ICON_PATH);
    svgEl.appendChild(pathEl);
    return svgEl;
  }

  function hasMessageCopyable(_KDB) {
    var message = _KDB.services && _KDB.services.message;
    return !!(message && typeof message.showCopyable === "function");
  }

  function initializeWienKi(_KDB, inst) {
    var label = _button.readButtonLabels(_KDB, ID).buttonTitle || "";
    var hasUrl = !!_wienKiPopup.readWienKiUrl(_KDB);
    var hasMessage = hasMessageCopyable(_KDB);
    if (!hasUrl) {
      _button.warnOnce(inst, "missingUrl", "[wienKiControls.mount] _KDB.config.links.wienKiUrl is missing or not https; controls disabled.");
    } else if (!hasMessage) {
      _button.warnOnce(inst, "missingMessage", "[wienKiControls.mount] _KDB.services.message.showCopyable is missing; controls disabled.");
    }
    inst.viewModel = { disabled: !(hasUrl && hasMessage), serviceAvailable: hasUrl && hasMessage, label: label };
  }

  function onWienKiClick(_KDB, inst) {
    var viewModel = inst.viewModel || {};
    if (viewModel.serviceAvailable === false || viewModel.disabled === true) return;
    _wienKiPopup.openWienKiInstructionDialog(_KDB, inst);
  }

  var wienKiDefinition = _button.createToolbarButton({
    id: ID,
    readTexts: function (_KDB) {
      var labels = _button.readButtonLabels(_KDB, ID);
      return { accessibleName: labels.buttonAccessibleName, title: labels.buttonTitle, labelText: labels.buttonTitle };
    },
    icon: { build: buildSpeechBubbleIcon },
    defaultLabel: "",
    defaultViewModel: { disabled: false, serviceAvailable: true, label: _config.LABELS.wienKi.buttonTitle },
    isUnavailable: function (viewModel) { return viewModel.serviceAvailable !== true; },
    initialize: initializeWienKi,
    onClick: onWienKiClick
  });

  function registerWienKiControls(_KDB) {
    return _index.registerToolbarButton(_KDB, wienKiDefinition);
  }

  return registerWienKiControls;
});
