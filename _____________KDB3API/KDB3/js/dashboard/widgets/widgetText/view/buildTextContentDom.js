define(["../config/defaults.js"], function (_defaults) {
  function __controller(_initialText) {
    try {
      var text = _initialText != null ? String(_initialText) : _defaults.defaultText;
      var staticContent = document.createElement("div");
      staticContent.className = stripDot(_defaults.staticContentSelector);
      var textFill = document.createElement("div");
      textFill.className = stripDot(_defaults.textFillSelector);
      var editable = document.createElement("div");
      editable.className = stripDot(_defaults.editableSelector);
      var paragraph = document.createElement("p");
      var span = document.createElement("span");
      span.textContent = text;
      paragraph.appendChild(span);
      editable.appendChild(paragraph);
      textFill.appendChild(editable);
      staticContent.appendChild(textFill);
      return staticContent;
    } catch (err) {
      console.error("[widgetText.buildTextContentDom] failed", err);
      return null;
    }
  }

  function stripDot(_selector) {
    return _selector.charAt(0) === "." ? _selector.slice(1) : _selector;
  }

  return __controller;
});
