define([], function () {
  "use strict";

  function resolveLoadingMountEl(_rootEl, _selector) {
    var ownerDoc = _rootEl && _rootEl.ownerDocument ? _rootEl.ownerDocument : null;
    var doc = ownerDoc || (typeof document !== "undefined" ? document : null);
    if (!doc || !_selector || typeof doc.querySelector !== "function") return null;
    return doc.querySelector(_selector);
  }

  return resolveLoadingMountEl;
});
