define(["../config/defaults.js"], function (_defaults) {
  function __controller(_KDB, _widgetId, _shellEl) {
    try {
      var shellEl = _shellEl || null;
      if (!shellEl && _widgetId) {
        shellEl = document.getElementById(_widgetId);
      }
      if (!shellEl) {
        return null;
      }
      var contentEl = shellEl.querySelector(_defaults.contentWrapperSelector) || shellEl;
      var editableEl = contentEl.querySelector(_defaults.textFillSelector + " " + _defaults.editableSelector)
        || contentEl.querySelector(_defaults.editableSelector)
        || document.getElementById(_widgetId + "Editable");
      if (editableEl && !shellEl.contains(editableEl)) {
        editableEl = null;
      }
      var paragraphEl = editableEl ? editableEl.querySelector("p") : null;
      var spanEl = editableEl ? editableEl.querySelector("span") : null;
      var textNodeForFont = spanEl || paragraphEl || editableEl;
      return {
        shellEl: shellEl,
        contentEl: contentEl,
        editableEl: editableEl,
        paragraphEl: paragraphEl,
        spanEl: spanEl,
        textNodeForFont: textNodeForFont
      };
    } catch (err) {
      console.error("[widgetText.resolveTextEditableNodes] failed", { widgetId: _widgetId }, err);
      return null;
    }
  }

  return __controller;
});
