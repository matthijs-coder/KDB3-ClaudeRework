define([], function () {
  "use strict";
  function placeFooter(mountTarget, rootEl) {
    if (!mountTarget || !rootEl) return;
    mountTarget.appendChild(rootEl);
  }
  return placeFooter;
});
