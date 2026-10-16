define([], function () {
  "use strict";

  // Ownership check for the double boot: when the anchor already points at a newer boot instance,
  // this instance's destroy must not remove it. The stamp is checked first; the probe call is only a
  // fallback (for example when a measuring wrapper replaced getKDB).
  function uninstallGetKDB(_KDB) {
    let topWindow;
    try {
      topWindow = window.top;
      void topWindow.document; // cross-origin access check
    } catch (accessError) {
      return;
    }
    const anchor = topWindow.getKDB;
    if (typeof anchor !== "function") { return; }
    let owned = anchor.__kdbOwner === _KDB;
    if (!owned) {
      let anchorTarget = null;
      try { anchorTarget = anchor(); } catch (anchorError) { anchorTarget = null; }
      owned = anchorTarget === _KDB;
    }
    if (!owned) { return; }
    try {
      if (!(delete topWindow.getKDB)) { topWindow.getKDB = undefined; }
    } catch (deleteError) {
      topWindow.getKDB = undefined;
    }
  }

  return { uninstallGetKDB: uninstallGetKDB };
});
