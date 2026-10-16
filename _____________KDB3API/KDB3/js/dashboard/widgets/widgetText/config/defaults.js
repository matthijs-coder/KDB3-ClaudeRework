define(["../../../../core/cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  var chrome = _widgetChrome.widget.strings;
  return {
    defaultText: "Text hier eingeben",
    automaticFontSize: "automatic",
    contentWrapperSelector: chrome.contentWrapperSelector,
    staticContentSelector: chrome.staticContentSelector,
    textFillSelector: chrome.textFillSelector,
    editableSelector: chrome.editableSelector,
    textFittedClass: chrome.textFittedClass,
    editActiveAttr: "data-kdb-text-edit-active"
  };
});
