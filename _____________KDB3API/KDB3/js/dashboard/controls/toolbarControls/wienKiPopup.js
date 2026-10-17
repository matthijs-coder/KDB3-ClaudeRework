define(["./config.js", "./toolbarButton.js"], function (_config, _button) {
  "use strict";

  var POPUP = _config.WIEN_KI_POPUP;
  var MIN_POPUP_HEIGHT_PX = 120;

  function readAbsoluteHttpsUrl(raw) {
    var trimmed = String(raw == null ? "" : raw).replace(/^\s+|\s+$/g, "");
    var parsed;
    if (!trimmed) return "";
    try {
      parsed = new URL(trimmed);
    } catch (_error) {
      return "";
    }
    return parsed.protocol === "https:" ? parsed.href : "";
  }

  function readWienKiUrl(_KDB) {
    var links = _KDB.config && _KDB.config.links;
    return readAbsoluteHttpsUrl(links && links.wienKiUrl);
  }

  // window.top can be cross-origin or missing: the helpers below fall back to the screen work area.
  function readHostChromeBottom(availTop, workBottom) {
    var host;
    var chromeBottom;
    try {
      host = window.top;
      if (!host || typeof host.screenY !== "number") return availTop;
      if (!(host.outerHeight > host.innerHeight) || !(host.innerHeight > 0)) return availTop;
      chromeBottom = Math.round(host.screenY + (host.outerHeight - host.innerHeight));
      if (!isFinite(chromeBottom) || chromeBottom <= availTop || chromeBottom >= workBottom - 120) return availTop;
      return chromeBottom;
    } catch (_error) {
      return availTop;
    }
  }

  function readHostOuterEdges(availLeft, availTop) {
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
      return right <= availLeft || bottom <= availTop ? null : { right: right, bottom: bottom };
    } catch (_error) {
      return null;
    }
  }

  function computePopupBox() {
    var availLeft = typeof screen.availLeft === "number" ? screen.availLeft : 0;
    var availTop = typeof screen.availTop === "number" ? screen.availTop : 0;
    var availWidth = screen.availWidth || POPUP.widthPx;
    var availHeight = screen.availHeight || 600;
    var hostEdges = readHostOuterEdges(availLeft, availTop);
    var workRight = hostEdges ? hostEdges.right : availLeft + availWidth;
    var workBottom = hostEdges ? hostEdges.bottom : availTop + availHeight;
    var overshoot = hostEdges ? 0 : (POPUP.frameOvershootPx || 0);
    var width = Math.min(POPUP.widthPx, availWidth);
    var top = readHostChromeBottom(availTop, workBottom) + POPUP.topOffsetPx;
    var left = workRight - width - POPUP.rightInsetPx + overshoot;
    var height;
    if (left < availLeft) left = availLeft;
    if (top < availTop) top = availTop;
    height = Math.max(MIN_POPUP_HEIGHT_PX, workBottom - top - POPUP.bottomInsetPx + overshoot);
    return {
      width: Math.round(width),
      height: Math.round(height),
      left: Math.round(left),
      top: Math.round(top),
      overshoot: Math.round(overshoot || POPUP.frameOvershootPx || 16),
      features: POPUP.chromeFeatures + ",width=" + Math.round(width) + ",height=" + Math.round(height) +
        ",left=" + Math.round(left) + ",top=" + Math.round(top)
    };
  }

  // A popup that navigated to another origin rejects these calls: expected, so only a debug trace.
  function callPopupMethod(win, methodName, first, second) {
    try {
      win[methodName](first, second);
    } catch (error) {
      console.debug("[wienKiControls.placePopup] " + methodName + " rejected", error);
    }
  }

  function nudgePopupBox(win, box) {
    var dx;
    var dy;
    var cap;
    try {
      if (!win || win.closed) return;
      if (![win.screenX, win.screenY, win.outerWidth, win.outerHeight].every(isFinite)) return;
      if (win.outerWidth < 1 || win.outerHeight < 1) return;
      cap = box.overshoot || 16;
      dx = Math.min(cap, box.left + box.width - (win.screenX + win.outerWidth));
      dy = Math.min(cap, box.top + box.height - (win.screenY + win.outerHeight));
    } catch (error) {
      console.debug("[wienKiControls.placePopup] popup geometry unreadable", error);
      return;
    }
    if (dx > 0) callPopupMethod(win, "moveBy", dx, 0);
    if (dy > 0) callPopupMethod(win, "resizeBy", 0, dy);
  }

  function applyAndNudgePopupBox(win, box) {
    callPopupMethod(win, "resizeTo", box.width, box.height);
    callPopupMethod(win, "moveTo", box.left, box.top);
    nudgePopupBox(win, box);
  }

  function placePopupBox(win, box) {
    applyAndNudgePopupBox(win, box);
    setTimeout(applyAndNudgePopupBox.bind(null, win, box), 0);
  }

  function openWienKiPopup(_KDB) {
    var url = readWienKiUrl(_KDB);
    var box;
    var win;
    if (!url) return false;
    try {
      box = computePopupBox();
      win = window.open(url, POPUP.windowName, box.features);
      if (!win) {
        console.warn("[wienKiControls.openWienKiPopup] WIENKI_POPUP_BLOCKED");
        return false;
      }
      placePopupBox(win, box);
      detachPopupOpener(win);
      return true;
    } catch (error) {
      console.error("[wienKiControls.openWienKiPopup]", error);
      return false;
    }
  }

  function detachPopupOpener(win) {
    try {
      win.opener = null;
    } catch (error) {
      console.warn("[wienKiControls.openWienKiPopup] opener could not be cleared", error);
    }
    try {
      win.focus();
    } catch (error) {
      console.warn("[wienKiControls.openWienKiPopup] focus failed", error);
    }
  }

  function readInstructionLabels(_KDB) {
    var labels = _button.readButtonLabels(_KDB, "wienKi");
    return {
      dialogTitle: labels.dialogTitle || "",
      dialogMessage: labels.dialogMessage || "",
      starterPrompt: labels.starterPrompt || "",
      openChatLabel: labels.openChatLabel || ""
    };
  }

  function onInstructionSettled(_KDB, inst, result) {
    inst.instructionDialogOpen = false;
    if (result && result.action === "selected") openWienKiPopup(_KDB);
  }

  function openWienKiInstructionDialog(_KDB, inst) {
    var message = _KDB.services && _KDB.services.message;
    var labels;
    var handle = null;
    if (inst.instructionDialogOpen === true) return;
    if (!message) return;
    labels = readInstructionLabels(_KDB);
    inst.instructionDialogOpen = true;
    try {
      handle = message.showCopyable({
        title: labels.dialogTitle,
        message: labels.dialogMessage,
        copyText: labels.starterPrompt,
        actionLabel: labels.openChatLabel
      });
    } finally {
      if (!handle || typeof handle.whenDone !== "function") inst.instructionDialogOpen = false;
    }
    if (handle && typeof handle.whenDone === "function") handle.whenDone(onInstructionSettled.bind(null, _KDB, inst));
  }

  return {
    readWienKiUrl: readWienKiUrl,
    openWienKiPopup: openWienKiPopup,
    openWienKiInstructionDialog: openWienKiInstructionDialog
  };
});
