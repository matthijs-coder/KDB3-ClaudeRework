define([], function () {
  "use strict";

  function __controller(_event, _runtime) {
    const originalEvent = _event && (_event.originalEvent || _event);
    const dataTransfer = originalEvent ? originalEvent.dataTransfer : null;
    let dragImageEl;
    let timerId;

    try {
      if (!dataTransfer || typeof dataTransfer.setDragImage !== "function") {
        return false;
      }
      dragImageEl = document.createElement("div");
      dragImageEl.style.width = "1px";
      dragImageEl.style.height = "1px";
      dragImageEl.style.opacity = "0";
      document.body.appendChild(dragImageEl);
      dataTransfer.setDragImage(dragImageEl, 0, 0);
      timerId = setTimeout(removeNativeDragImage.bind(null, dragImageEl, _runtime, timerId), 0);
      registerTimer(_runtime, timerId, dragImageEl);
      return true;
    } catch (error) {
      console.error("[dragDrop.suppressNativeDragImage] failed", error);
      removeElement(dragImageEl);
      return false;
    }
  }

  function registerTimer(_runtime, timerId, dragImageEl) {
    if (!_runtime) {
      return;
    }
    _runtime.timers = _runtime.timers || {};
    _runtime.timers.nativeDragImage = timerId;
    _runtime.domRefs = _runtime.domRefs || {};
    _runtime.domRefs.nativeDragImageEl = dragImageEl;
  }

  function removeNativeDragImage(dragImageEl, _runtime, timerId) {
    removeElement(dragImageEl);
    if (_runtime && _runtime.timers && _runtime.timers.nativeDragImage === timerId) {
      delete _runtime.timers.nativeDragImage;
    }
    if (_runtime && _runtime.domRefs && _runtime.domRefs.nativeDragImageEl === dragImageEl) {
      delete _runtime.domRefs.nativeDragImageEl;
    }
  }

  function removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  return __controller;
});
