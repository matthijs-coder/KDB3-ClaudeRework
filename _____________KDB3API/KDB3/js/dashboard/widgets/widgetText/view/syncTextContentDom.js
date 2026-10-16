define([], function () {
  function __controller(_nodes, _text) {
    try {
      if (!_nodes) {
        return "";
      }
      var text = _text != null ? String(_text) : "";
      var target = _nodes.paragraphEl || _nodes.editableEl;
      if (!target) {
        return "";
      }
      if (_nodes.paragraphEl && _nodes.spanEl) {
        _nodes.spanEl.textContent = text;
      } else if (_nodes.paragraphEl) {
        _nodes.paragraphEl.textContent = text;
      } else {
        target.textContent = text;
      }
      return text;
    } catch (err) {
      console.error("[widgetText.syncTextContentDom] failed", err);
      throw err;
    }
  }
  return __controller;
});
