define([], function () {
  "use strict";

  function __controller(_runtime, _event, _session) {
    const avatarEl = _runtime && _runtime.domRefs ? _runtime.domRefs.avatarEl : null;
    const originalEvent = _event && (_event.originalEvent || _event);

    if (!avatarEl || !originalEvent || !_session) {
      return false;
    }

    avatarEl.style.left = Math.round(originalEvent.clientX - (_session.offsetX || 0)) + "px";
    avatarEl.style.top = Math.round(originalEvent.clientY - (_session.offsetY || 0)) + "px";
    avatarEl.style.width = Math.round(_session.defaultWidth || 300) + "px";
    avatarEl.style.height = Math.round(_session.defaultHeight || 300) + "px";
    return true;
  }

  return __controller;
});
