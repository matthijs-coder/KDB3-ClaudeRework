define([
  "../config/popupFeatures.js"
], function (_popupFeatures) {
  "use strict";

  function readHostChromeBottom(_availTop, _workBottom) {
    var host;
    var chromeBottom;
    try {
      host = window.top;
      if (!host) return _availTop;
      if (typeof host.screenY !== "number") return _availTop;
      if (!(host.outerHeight > host.innerHeight) || !(host.innerHeight > 0)) return _availTop;
      chromeBottom = Math.round(host.screenY + (host.outerHeight - host.innerHeight));
      if (!isFinite(chromeBottom)) return _availTop;
      if (chromeBottom <= _availTop) return _availTop;
      if (chromeBottom >= _workBottom - 120) return _availTop;
      return chromeBottom;
    } catch (err) {
      return _availTop;
    }
  }

  function readHostOuterEdges(_availLeft, _availTop) {
    var host;
    var right;
    var bottom;
    try {
      host = window.top;
      if (!host) return null;
      if (!isFinite(host.screenX) || !isFinite(host.screenY)) return null;
      if (!isFinite(host.outerWidth) || !isFinite(host.outerHeight)) return null;
      if (!(host.outerWidth > 0) || !(host.outerHeight > 0)) return null;
      right = Math.round(host.screenX + host.outerWidth);
      bottom = Math.round(host.screenY + host.outerHeight);
      if (right <= _availLeft || bottom <= _availTop) return null;
      return { right: right, bottom: bottom };
    } catch (err) {
      return null;
    }
  }

  function computeWienKiPopupBox() {
    var features = _popupFeatures;
    var availLeft;
    var availTop;
    var availWidth;
    var availHeight;
    var hostEdges;
    var overshoot;
    var workRight;
    var workBottom;
    var width;
    var top;
    var left;
    var height;
    try {
      availLeft = typeof screen.availLeft === "number" ? screen.availLeft : 0;
      availTop = typeof screen.availTop === "number" ? screen.availTop : 0;
      availWidth = screen.availWidth || features.widthPx;
      availHeight = screen.availHeight || 600;
      hostEdges = readHostOuterEdges(availLeft, availTop);
      workRight = hostEdges ? hostEdges.right : availLeft + availWidth;
      workBottom = hostEdges ? hostEdges.bottom : availTop + availHeight;
      overshoot = hostEdges ? 0 : (features.frameOvershootPx || 0);
      width = Math.min(features.widthPx, availWidth);
      top = readHostChromeBottom(availTop, workBottom) + features.topOffsetPx;
      left = workRight - width - features.rightInsetPx + overshoot;
      if (left < availLeft) left = availLeft;
      if (top < availTop) top = availTop;
      height = Math.max(120, workBottom - top - features.bottomInsetPx + overshoot);
      return {
        width: Math.round(width),
        height: Math.round(height),
        left: Math.round(left),
        top: Math.round(top),
        overshoot: Math.round(overshoot || features.frameOvershootPx || 16),
        features: features.chromeFeatures +
          ",width=" + Math.round(width) +
          ",height=" + Math.round(height) +
          ",left=" + Math.round(left) +
          ",top=" + Math.round(top)
      };
    } catch (err) {
      console.error("[wienKiControls.openWienKiPopup]", err);
      throw err;
    }
  }

  return computeWienKiPopupBox;
});
