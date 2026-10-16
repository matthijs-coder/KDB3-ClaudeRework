define([], function () {
  "use strict";

  function readElementScale(_element) {
    const rect = _element && _element.getBoundingClientRect ? _element.getBoundingClientRect() : null;
    const scaleX = rect && _element.offsetWidth > 0 ? rect.width / _element.offsetWidth : 1;
    const scaleY = rect && _element.offsetHeight > 0 ? rect.height / _element.offsetHeight : 1;
    return {
      scaleX: isFinite(scaleX) && scaleX > 0 ? scaleX : 1,
      scaleY: isFinite(scaleY) && scaleY > 0 ? scaleY : 1
    };
  }

  return readElementScale;
});
