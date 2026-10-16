define([], function () {
  "use strict";

  function normalizeCanvasContentItems(_content) {
    if (Array.isArray(_content)) {
      return _content;
    }
    if (_content && Array.isArray(_content.items)) {
      return _content.items;
    }
    if (_content && Array.isArray(_content.children)) {
      return _content.children;
    }
    return [];
  }

  return normalizeCanvasContentItems;
});
