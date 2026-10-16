define([], function () {
  "use strict";

  function applyPopupBox(_win, _box) {
    try { _win.resizeTo(_box.width, _box.height); } catch (resizeErr) {}
    try { _win.moveTo(_box.left, _box.top); } catch (moveErr) {}
  }

  function nudgePopupBox(_win, _box) {
    var x;
    var y;
    var w;
    var h;
    var dx;
    var dy;
    var cap;
    try {
      if (!_win || _win.closed) return;
      x = _win.screenX;
      y = _win.screenY;
      w = _win.outerWidth;
      h = _win.outerHeight;
      if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h)) return;
      if (w < 1 || h < 1) return;
      cap = _box.overshoot || 16;
      dx = _box.left + _box.width - (x + w);
      dy = _box.top + _box.height - (y + h);
      if (dx > cap) dx = cap;
      if (dy > cap) dy = cap;
      if (dx > 0) { try { _win.moveBy(dx, 0); } catch (moveByErr) {} }
      if (dy > 0) { try { _win.resizeBy(0, dy); } catch (resizeByErr) {} }
    } catch (err) {}
  }

  function applyAndNudgePopupBox(_win, _box) {
    applyPopupBox(_win, _box);
    nudgePopupBox(_win, _box);
  }

  function placeWienKiPopupBox(_win, _box) {
    try {
      if (!_win) return;
      applyAndNudgePopupBox(_win, _box);
      setTimeout(applyAndNudgePopupBox.bind(null, _win, _box), 0);
    } catch (err) {
      console.error("[wienKiControls.openWienKiPopup]", err);
    }
  }

  return placeWienKiPopupBox;
});
