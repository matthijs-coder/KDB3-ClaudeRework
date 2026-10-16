define([], function () {
  "use strict";
  function placeHeader(mountTarget, rootEl) {
    if (!mountTarget || !rootEl) return;
    if (mountTarget.firstChild) {
      mountTarget.insertBefore(rootEl, mountTarget.firstChild);
      return;
    }
    mountTarget.appendChild(rootEl);
  }
  return placeHeader;
});
