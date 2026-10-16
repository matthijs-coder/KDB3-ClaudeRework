define(["../../../core/cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  "use strict";

  var chrome = _widgetChrome.widget.strings;

  function stripDot(_selector) {
    return _selector.charAt(0) === "." ? _selector.slice(1) : _selector;
  }

  var KNOWN_HEADER_CLASSES = [
    "KDB_widgetHeader_defaultStyle",
    "KDB_widgetHeader_allBordersStyle",
    "KDB_widgetHeader_bottomBorderStyle",
    "KDB_widgetHeader_topBorderStyle",
    "KDB_widgetHeader_centeredStyle",
    "KDB_widgetHeader_allBordersCenteredStyle",
    "KDB_widgetHeader_bottomBorderCenteredStyle",
    "KDB_widgetHeader_topBorderCenteredStyle"
  ];

  // Option keys are the German labels of the restyle dropdown; they are persisted by widgetSettings.
  var OPTION_KEY_TO_CLASS = {
    default: "KDB_widgetHeader_defaultStyle",
    "rahmen(alle)": "KDB_widgetHeader_allBordersStyle",
    "rahmen(unterer)": "KDB_widgetHeader_bottomBorderStyle",
    "rahmen(oberer)": "KDB_widgetHeader_topBorderStyle",
    zentriert: "KDB_widgetHeader_centeredStyle",
    "rahmen(alle) und zentriert": "KDB_widgetHeader_allBordersCenteredStyle",
    "rahmen(unterer) und zentriert": "KDB_widgetHeader_bottomBorderCenteredStyle",
    "rahmen(oberer) und zentriert": "KDB_widgetHeader_topBorderCenteredStyle",
    reinigen: null
  };

  return {
    defaultText: "Text hier eingeben",
    automaticFontSize: "automatic",
    contentWrapperSelector: chrome.contentWrapperSelector,
    staticContentSelector: chrome.staticContentSelector,
    textFillSelector: chrome.textFillSelector,
    editableSelector: chrome.editableSelector,
    staticContentClass: stripDot(chrome.staticContentSelector),
    textFillClass: stripDot(chrome.textFillSelector),
    editableClass: stripDot(chrome.editableSelector),
    textFittedClass: chrome.textFittedClass,
    editActiveAttr: "data-kdb-text-edit-active",
    restyle: {
      knownHeaderClasses: KNOWN_HEADER_CLASSES,
      optionKeyToClass: OPTION_KEY_TO_CLASS,
      defaultClass: "KDB_widgetHeader_defaultStyle"
    }
  };
});
