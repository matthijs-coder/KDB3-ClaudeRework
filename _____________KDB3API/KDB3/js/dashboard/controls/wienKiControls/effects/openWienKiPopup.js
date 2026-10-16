define([
  "../config/popupFeatures.js",
  "./computeWienKiPopupBox.js",
  "./placeWienKiPopupBox.js"
], function (_popupFeatures, _computeWienKiPopupBox, _placeWienKiPopupBox) {
  "use strict";

  function readAbsoluteHttpsUrl(_raw) {
    var trimmed = String(_raw == null ? "" : _raw).replace(/^\s+|\s+$/g, "");
    var parsed;
    if (!trimmed) return "";
    try {
      parsed = new URL(trimmed);
    } catch (err) {
      return "";
    }
    if (parsed.protocol !== "https:") return "";
    return parsed.href;
  }

  function openWienKiPopup(_KDB) {
    var links = _KDB.config && _KDB.config.links;
    var url = readAbsoluteHttpsUrl(links && links.wienKiUrl);
    var box;
    var win;
    try {
      if (!url) return false;
      box = _computeWienKiPopupBox();
      win = window.open(url, _popupFeatures.windowName, box.features);
      if (!win) {
        console.warn("[wienKiControls.openWienKiPopup] WIENKI_POPUP_BLOCKED");
        return false;
      }
      _placeWienKiPopupBox(win, box);
      try { win.opener = null; } catch (openerErr) {}
      try { win.focus(); } catch (focusErr) {}
      return true;
    } catch (err) {
      console.error("[wienKiControls.openWienKiPopup]", err);
      return false;
    }
  }

  return openWienKiPopup;
});
